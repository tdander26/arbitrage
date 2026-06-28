import type { TrendPoint, TrendSeries } from "./types";

// Live Google Trends fetch via the unofficial public endpoints. There is no
// official API, so this is best-effort: it can be rate-limited (HTTP 429) or
// blocked from serverless IPs. Callers should fall back to seeded data on any
// failure — `getTrend` never throws, it returns source:"sample" instead.

const EXPLORE = "https://trends.google.com/trends/api/explore";
const MULTILINE = "https://trends.google.com/trends/api/widgetdata/multiline";

// Google prefixes its JSON with ")]}'," — strip it before parsing.
function parseGoogleJson<T>(text: string): T {
  const start = text.indexOf("{") >= 0 ? text.indexOf("{") : text.indexOf("[");
  return JSON.parse(text.slice(start)) as T;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // A browser-like UA reduces the chance of being blocked.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } finally {
    clearTimeout(id);
  }
}

type ExploreWidget = {
  id: string;
  token: string;
  request: unknown;
};

/**
 * Fetch a 12-month interest-over-time series for a keyword from Google Trends.
 * Returns source:"live" on success; throws on any failure.
 */
async function fetchGoogleTrends(keyword: string): Promise<TrendPoint[]> {
  const exploreReq = {
    comparisonItem: [{ keyword, geo: "US", time: "today 12-m" }],
    category: 0,
    property: "",
  };
  const exploreUrl =
    `${EXPLORE}?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(exploreReq))}`;

  const exploreRes = await fetchWithTimeout(exploreUrl, 4500);
  if (!exploreRes.ok) throw new Error(`explore HTTP ${exploreRes.status}`);
  const explore = parseGoogleJson<{ widgets: ExploreWidget[] }>(
    await exploreRes.text(),
  );

  const timeseries = explore.widgets.find((w) => w.id === "TIMESERIES");
  if (!timeseries) throw new Error("no TIMESERIES widget");

  const dataUrl =
    `${MULTILINE}?hl=en-US&tz=0&req=${encodeURIComponent(
      JSON.stringify(timeseries.request),
    )}&token=${timeseries.token}`;

  const dataRes = await fetchWithTimeout(dataUrl, 4500);
  if (!dataRes.ok) throw new Error(`multiline HTTP ${dataRes.status}`);
  const data = parseGoogleJson<{
    default: { timelineData: { time: string; value: number[] }[] };
  }>(await dataRes.text());

  return data.default.timelineData.map((d) => ({
    date: new Date(Number(d.time) * 1000).toISOString().slice(0, 10),
    value: d.value[0] ?? 0,
  }));
}

// SerpApi Google Trends. Reliable from serverless (unlike the keyless endpoint,
// which Google blocks from datacenter IPs). Results are cached for a week via
// the Next data cache so a full refresh of the watchlist stays within SerpApi's
// free monthly quota. Get a key at https://serpapi.com and set SERPAPI_KEY.
type SerpTimelineEntry = {
  timestamp?: string;
  values?: { extracted_value?: number; value?: string }[];
};

async function fetchSerpApiTrends(keyword: string): Promise<TrendPoint[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error("no SERPAPI_KEY");

  const params = new URLSearchParams({
    engine: "google_trends",
    q: keyword,
    data_type: "TIMESERIES",
    date: "today 12-m",
    geo: "US",
    api_key: key,
  });
  const url = `https://serpapi.com/search.json?${params}`;

  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      // Cache each keyword for 14 days. With ~21 seeded keywords that's ~45
      // SerpApi calls/month, leaving comfortable headroom under the free 100.
      next: { revalidate: 1209600 },
    });
    if (!res.ok) throw new Error(`serpapi HTTP ${res.status}`);
    const json = (await res.json()) as {
      interest_over_time?: { timeline_data?: SerpTimelineEntry[] };
      error?: string;
    };
    if (json.error) throw new Error(json.error);
    const timeline = json.interest_over_time?.timeline_data ?? [];
    const points = timeline
      .map((d) => {
        const v = d.values?.[0];
        const value =
          v?.extracted_value ?? (v?.value ? Number(v.value) : NaN);
        const date = d.timestamp
          ? new Date(Number(d.timestamp) * 1000).toISOString().slice(0, 10)
          : "";
        return { date, value };
      })
      .filter((p) => p.date && Number.isFinite(p.value));
    if (points.length === 0) throw new Error("empty serpapi series");
    return points;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Get a trend series for a keyword. Tries SerpApi (reliable, keyed), then the
 * keyless Google endpoint, then falls back to the supplied sample series.
 */
export async function getTrend(
  keyword: string,
  fallback: TrendPoint[],
): Promise<TrendSeries> {
  // 1) SerpApi — the reliable server-side source.
  try {
    const points = await fetchSerpApiTrends(keyword);
    return { keyword, source: "live", points };
  } catch {
    /* fall through */
  }
  // 2) Keyless Google endpoint — usually blocked from servers, but free.
  try {
    const points = await fetchGoogleTrends(keyword);
    if (points.length === 0) throw new Error("empty series");
    return { keyword, source: "live", points };
  } catch {
    return { keyword, source: "sample", points: fallback };
  }
}
