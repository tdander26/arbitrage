import type { ScoreComponents } from "@/lib/providers/types";

const LABELS: Record<keyof ScoreComponents, string> = {
  socialMomentum: "Social momentum",
  trendsMomentum: "Search-trend momentum",
  correlation: "Social ↔ search correlation",
  earningsProximity: "Earnings proximity",
};

export default function ScoreBreakdown({
  components,
  weights,
}: {
  components: ScoreComponents;
  weights: ScoreComponents;
}) {
  const keys = Object.keys(LABELS) as (keyof ScoreComponents)[];
  return (
    <div className="space-y-3">
      {keys.map((k) => {
        const v = components[k];
        const contribution = v * weights[k];
        return (
          <div key={k}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted">
                {LABELS[k]} <span className="text-xs opacity-60">×{weights[k]}</span>
              </span>
              <span className="tabular-nums">
                {Math.round(v)} <span className="text-muted text-xs">(+{contribution.toFixed(1)})</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, Math.min(100, v))}%`, background: "#4f8cff" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
