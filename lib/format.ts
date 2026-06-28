export function fmtPrice(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return "—";
  const sign = v > 0 ? "+" : "";
  return sign + v.toFixed(2) + "%";
}

export function scoreColor(score: number): string {
  if (score >= 66) return "#2ecc71";
  if (score >= 45) return "#ffb648";
  return "#8b95a8";
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
