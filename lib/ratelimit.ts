// Best-effort in-memory rate limiter for the public API routes. Serverless
// instances don't share memory, so this caps bursts per warm instance rather
// than enforcing a hard global ceiling — a true cross-instance cap needs a
// shared store (KV/Upstash). It still meaningfully blunts a script hammering a
// single endpoint, and the upstream free tiers (Finnhub/SerpApi/Apify) stop
// rather than bill once exhausted, so this is defense-in-depth on cost.

const hits = new Map<string, number[]>();

/** Returns true if the request is allowed, false if it should be 429'd. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}

/** Derive a coarse client key from the request (proxy IP, else "global"). */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "global";
}
