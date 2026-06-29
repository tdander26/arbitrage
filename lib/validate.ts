// Lightweight validation for user-supplied params hitting paid external APIs.
// These endpoints are public, so we bound input to avoid forwarding abusive or
// malformed values to SerpApi / Finnhub / Apify.

export function cleanTicker(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase();
  // 1–5 letters, optionally a single .X / -X class suffix (BRK.B, RDS-A).
  return /^[A-Z]{1,5}([.\-][A-Z]{1,2})?$/.test(t) ? t : null;
}

export function cleanKeyword(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Collapse whitespace and cap length.
  const k = raw.trim().replace(/\s+/g, " ");
  if (k.length < 1 || k.length > 60) return null;
  // Reject any ASCII control characters (codepoints < 32).
  for (let i = 0; i < k.length; i++) {
    if (k.charCodeAt(i) < 32) return null;
  }
  return k;
}
