// Rate limiter for the public API routes. Uses a shared KV store (Vercel KV /
// Upstash Redis, via its REST API) when configured — giving a real
// cross-instance hard cap — and falls back to a best-effort per-instance
// in-memory limiter otherwise. The upstream free tiers (Finnhub/SerpApi/Apify)
// also stop rather than bill once exhausted, so this is defense-in-depth.
//
// To enable the hard cap: create a KV store in Vercel (Storage → Upstash), which
// injects KV_REST_API_URL and KV_REST_API_TOKEN; no code change needed.

const hits = new Map<string, number[]>();

function inMemory(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}

// Fixed-window counter in KV: INCR a per-window key, set its TTL on first use.
async function kvLimit(
  url: string,
  token: string,
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const bucket = Math.floor(Date.now() / windowMs);
  const k = `rl:${key}:${bucket}`;
  const auth = { Authorization: `Bearer ${token}` };
  const incr = await fetch(`${url}/incr/${encodeURIComponent(k)}`, {
    headers: auth,
    cache: "no-store",
  });
  if (!incr.ok) throw new Error(`kv incr ${incr.status}`);
  const { result } = (await incr.json()) as { result: number };
  if (result === 1) {
    // First hit in this window — set expiry so the counter resets.
    await fetch(
      `${url}/pexpire/${encodeURIComponent(k)}/${windowMs}`,
      { headers: auth, cache: "no-store" },
    ).catch(() => {});
  }
  return result <= max;
}

/** Returns true if allowed, false if the caller should 429. Never throws. */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    try {
      return await kvLimit(url, token, key, max, windowMs);
    } catch {
      // KV unreachable — degrade to the in-memory limiter rather than fail open.
      return inMemory(key, max, windowMs);
    }
  }
  return inMemory(key, max, windowMs);
}

/** Derive a coarse client key from the request (proxy IP, else "global"). */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "global";
}
