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

/**
 * Get a trend series for a keyword. Tries live Google Trends; on any failure
 * returns the supplied sample series flagged as source:"sample".
 */
export async function getTrend(
  keyword: string,
  fallback: TrendPoint[],
): Promise<TrendSeries> {
  try {
    const points = await fetchGoogleTrends(keyword);
    if (points.length === 0) throw new Error("empty series");
    return { keyword, source: "live", points };
  } catch {
    return { keyword, source: "sample", points: fallback };
  }
}
