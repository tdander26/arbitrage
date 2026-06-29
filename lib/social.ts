// Social-volume provider (TikTok) via Apify, using an ASYNC start-and-poll
// flow. The TikTok scraper can take 30–90s — longer than a serverless request
// should block — so we start the run in one fast request and poll its status
// in subsequent ones, rather than holding a single connection open (which made
// the client hang on "checking…" forever).
//
// Get a token at https://console.apify.com/account/integrations and set
// APIFY_TOKEN in Vercel.  Actor: https://apify.com/clockworks/tiktok-trends-scraper

export type SocialStatus =
  | { status: "pending" }
  | { status: "done"; score: number }
  | { status: "failed" };

// The general TikTok scraper returns per-video engagement for a hashtag search
// (the trends scraper returns country trend lists with no per-hashtag stats).
// Override with APIFY_TIKTOK_ACTOR if you prefer a different one.
const DEFAULT_ACTOR = "clockworks~tiktok-scraper";

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

// Engagement fields vary by actor/version — sometimes flat (playCount), some-
// times nested under `stats`. Read whichever is present.
type TikTokItem = {
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
  stats?: { playCount?: number; diggCount?: number; shareCount?: number };
};

function eng(it: TikTokItem, field: "playCount" | "diggCount" | "shareCount") {
  return it[field] ?? it.stats?.[field] ?? 0;
}

// Compress raw engagement into a 0–100 score with a log scale so a few viral
// posts don't peg everything at 100.
function scoreFromItems(items: TikTokItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce(
    (sum, it) =>
      sum +
      eng(it, "playCount") +
      eng(it, "diggCount") * 5 +
      eng(it, "shareCount") * 10,
    0,
  );
  const avg = total / items.length;
  // log10(avg) maps ~1 → 0 and ~1e7 → 100.
  const score = (Math.log10(Math.max(avg, 1)) / 7) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Start an Apify TikTok run for a keyword. Returns the runId immediately, or
 * null when APIFY_TOKEN is unset or the run couldn't be started.
 */
export async function startSocialRun(keyword: string): Promise<string | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;

  const actor = process.env.APIFY_TIKTOK_ACTOR ?? DEFAULT_ACTOR;
  const url = `https://api.apify.com/v2/acts/${actor}/runs?token=${token}`;
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashtags: [keyword], resultsPerPage: 10 }),
      },
      8000,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { id?: string } };
    return json.data?.id ?? null;
  } catch {
    return null;
  }
}

/** Poll a started run. Returns pending until the actor finishes. */
export async function getSocialRun(runId: string): Promise<SocialStatus> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { status: "failed" };

  try {
    const res = await fetchWithTimeout(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`,
      {},
      8000,
    );
    if (!res.ok) return { status: "failed" };
    const json = (await res.json()) as { data?: { status?: string } };
    const s = json.data?.status;

    if (s === "SUCCEEDED") {
      const itemsRes = await fetchWithTimeout(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=25`,
        {},
        8000,
      );
      if (!itemsRes.ok) return { status: "failed" };
      const items = (await itemsRes.json()) as TikTokItem[];
      return { status: "done", score: scoreFromItems(items) };
    }
    if (s === "READY" || s === "RUNNING") return { status: "pending" };
    return { status: "failed" }; // FAILED / ABORTED / TIMED-OUT
  } catch {
    return { status: "failed" };
  }
}
