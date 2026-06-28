import { scoreColor } from "@/lib/format";

export default function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color = scoreColor(score);
  const dims =
    size === "lg" ? "w-16 h-16 text-2xl" : size === "sm" ? "w-9 h-9 text-xs" : "w-12 h-12 text-base";
  return (
    <div
      className={`${dims} rounded-full flex items-center justify-center font-semibold shrink-0`}
      style={{ color, border: `2px solid ${color}`, background: `${color}1a` }}
      title={`Arbitrage score: ${score}`}
    >
      {Math.round(score)}
    </div>
  );
}
