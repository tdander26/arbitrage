"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import type { MergedChartPoint } from "@/lib/signals";
import type { EarningsEvent } from "@/lib/providers/types";
import { fmtDate } from "@/lib/format";

const SERIES = [
  { key: "social", label: "Social mentions", color: "#ff5d6c" },
  { key: "trends", label: "Google Trends", color: "#ffb648" },
  { key: "price", label: "Price", color: "#4f8cff" },
] as const;

/**
 * The hero overlay: social (leads) → trends (lags ~3d) → price, all rescaled
 * 0-100 onto a shared time axis, with earnings dates marked. Toggling series
 * lets you eyeball the lead/lag relationship the thesis is built on.
 */
export default function SignalChart({
  data,
  earnings,
}: {
  data: MergedChartPoint[];
  earnings: EarningsEvent[];
}) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setHidden((h) => ({ ...h, [k]: !h[k] }));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {SERIES.map((s) => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className="btn flex items-center gap-2"
            style={{ opacity: hidden[s.key] ? 0.4 : 1 }}
          >
            <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#222a3a" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={fmtDate}
            tick={{ fill: "#8b95a8", fontSize: 11 }}
            minTickGap={36}
            stroke="#222a3a"
          />
          <YAxis domain={[0, 100]} tick={{ fill: "#8b95a8", fontSize: 11 }} stroke="#222a3a" />
          <Tooltip
            contentStyle={{ background: "#141925", border: "1px solid #222a3a", borderRadius: 8 }}
            labelFormatter={(l) => fmtDate(String(l))}
            labelStyle={{ color: "#e6eaf2" }}
          />
          <Legend wrapperStyle={{ display: "none" }} />
          {!hidden.social && (
            <Area
              type="monotone"
              dataKey="social"
              name="Social mentions"
              stroke="#ff5d6c"
              fill="#ff5d6c22"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          {!hidden.trends && (
            <Line
              type="monotone"
              dataKey="trends"
              name="Google Trends"
              stroke="#ffb648"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          {!hidden.price && (
            <Line
              type="monotone"
              dataKey="price"
              name="Price"
              stroke="#4f8cff"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
          )}
          {earnings.map((e) => (
            <ReferenceLine
              key={e.reportDate}
              x={e.reportDate}
              stroke={e.reportDate >= today ? "#2ecc71" : "#3a4357"}
              strokeDasharray="4 3"
              label={{
                value: e.reportDate >= today ? "Earnings ▶" : "Earnings",
                fill: e.reportDate >= today ? "#2ecc71" : "#6b7488",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted mt-2">
        All series rescaled 0–100 for comparison. Watch for social mentions
        rising first, search interest following, ahead of an upcoming earnings
        date (green line).
      </p>
    </div>
  );
}
