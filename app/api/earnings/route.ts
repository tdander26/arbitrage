import { NextResponse } from "next/server";
import { getAllSignals } from "@/lib/signals";

export const dynamic = "force-dynamic";

/** Upcoming + recent earnings across the watchlist, joined with current score. */
export async function GET() {
  const signals = await getAllSignals();
  const rows = signals.flatMap((s) =>
    s.earnings.map((e) => ({
      ...e,
      name: s.name,
      score: s.score.score,
      daysUntil: Math.round(
        (new Date(e.reportDate + "T00:00:00Z").getTime() - Date.now()) / 86400000,
      ),
    })),
  );
  rows.sort((a, b) => a.reportDate.localeCompare(b.reportDate));
  return NextResponse.json(rows);
}
