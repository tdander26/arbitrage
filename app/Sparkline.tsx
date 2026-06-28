import type { TrendPoint } from "@/lib/types";

// Tiny dependency-free SVG sparkline of a trend series.
export default function Sparkline({
  points,
  width = 160,
  height = 40,
  color = "var(--accent)",
}: {
  points: TrendPoint[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;

  const coords = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const path = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path d={path} fill="none" stroke={color} strokeWidth={1.6} />
      <circle cx={lastX} cy={lastY} r={2.4} fill={color} />
    </svg>
  );
}
