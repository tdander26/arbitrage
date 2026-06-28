import Link from "next/link";
import { getTickerSignal } from "@/lib/signals";
import { getWatchlist } from "@/lib/watchlist";
import SignalChart from "@/components/SignalChart";
import ScoreBadge from "@/components/ScoreBadge";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import { fmtPrice, fmtPct, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TickerPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const wl = await getWatchlist();
  const meta = wl.find((t) => t.symbol === symbol);
  const sig = await getTickerSignal(symbol, meta?.name ?? symbol, meta?.sector ?? "—");

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-muted hover:text-text">
        ← Dashboard
      </Link>

      <div className="flex items-center gap-4">
        <ScoreBadge score={sig.score.score} size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {sig.symbol} <span className="text-muted text-base font-normal">{sig.name}</span>
          </h1>
          <div className="text-sm text-muted">{sig.sector}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">{fmtPrice(sig.latestPrice)}</div>
          <div className={`text-sm ${sig.priceChangePct && sig.priceChangePct >= 0 ? "text-bull" : "text-bear"}`}>
            {fmtPct(sig.priceChangePct)}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-1">Signal overlay</h2>
        <SignalChart data={sig.chart} earnings={sig.earnings} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Arbitrage score breakdown</h2>
          <ScoreBreakdown components={sig.score.components} weights={sig.score.weights} />
          <p className="text-xs text-muted mt-4">
            Composite of weighted components, 0–100. A heuristic to surface
            attention before it shows up in fundamentals — not a recommendation.
          </p>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-3">Earnings</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left">
                <th className="font-normal pb-2">Date</th>
                <th className="font-normal pb-2">When</th>
                <th className="font-normal pb-2 text-right">Est. EPS</th>
                <th className="font-normal pb-2 text-right">Actual</th>
                <th className="font-normal pb-2 text-right">Surprise</th>
              </tr>
            </thead>
            <tbody>
              {sig.earnings
                .slice()
                .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
                .map((e) => (
                  <tr key={e.reportDate} className="border-t border-border">
                    <td className="py-2">{fmtDate(e.reportDate)}</td>
                    <td className="py-2 uppercase text-xs text-muted">{e.time}</td>
                    <td className="py-2 text-right tabular-nums">{e.epsEstimate ?? "—"}</td>
                    <td className="py-2 text-right tabular-nums">{e.epsActual ?? "—"}</td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        e.surprisePct == null ? "text-muted" : e.surprisePct >= 0 ? "text-bull" : "text-bear"
                      }`}
                    >
                      {e.surprisePct == null ? "—" : fmtPct(e.surprisePct)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="text-xs text-muted mt-4">
            Post-earnings surprises let you check the thesis: did a high pre-earnings
            signal precede a beat?
          </p>
        </div>
      </div>
    </div>
  );
}
