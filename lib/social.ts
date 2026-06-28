// Social-volume provider (TikTok) via Apify. When APIFY_TOKEN is set, the app
// runs the TikTok Trends / hashtag scraper for a keyword and returns a coarse
// activity score; otherwise social volume is logged manually. Never throws —
// returns null on any miss.
//
// Get a token at https://console.apify.com/account/integrations and add it in
// Vercel: Settings → Environment Variables → APIFY_TOKEN
//
// Actor: https://apify.com/clockworks/tiktok-trends-scraper

export type SocialVolume = {
  keyword: string;
  /** Normalized 0–100 activity score derived from recent post engagement. */
  score: number;
  source: "apify";
};

// Default actor; override with APIFY_TIKTOK_ACTOR if you prefer another.
const DEFAULT_ACTOR = "clockworks~tiktok-trends-scraper";

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

type TikTokItem = {
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
};

// Compress raw engagement into a 0–100 score with a log scale so a few viral
// posts don't peg everything at 100.
function scoreFromItems(items: TikTokItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce(
    (sum, it) =>
      sum + (it.playCount ?? 0) + (it.diggCount ?? 0) * 5 + (it.shareCount ?? 0) * 10,
    0,
  );
  const avg = total / items.length;
  // log10(avg) maps ~1 → 0 and ~1e7 → 100.
  const score = (Math.log10(Math.max(avg, 1)) / 7) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Run the Apify TikTok actor synchronously for a keyword and return a 0–100
 * activity score, or null if APIFY_TOKEN is unset or the run fails.
 */
export async function getSocialVolume(
  keyword: string,
): Promise<SocialVolume | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;

  const actor = process.env.APIFY_TIKTOK_ACTOR ?? DEFAULT_ACTOR;
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`;

  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Keep the result set small so the actor run finishes within the
        // serverless time budget.
        body: JSON.stringify({ hashtags: [keyword], resultsPerPage: 10 }),
      },
      55_000,
    );
    if (!res.ok) return null;
    const items = (await res.json()) as TikTokItem[];
    return { keyword, score: scoreFromItems(items), source: "apify" };
  } catch {
    return null;
  }
}
