"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Conviction, EnrichedOpportunity, Status } from "@/lib/types";
import { momentumOf } from "@/lib/enrich";
import { beatRate, computeSignal } from "@/lib/signal";
import { useOverrides } from "./useOverrides";
import { useCustom } from "./useCustom";
import Card, { type CardView } from "./Card";

type Feed = {
  asOf: string;
  count: number;
  earningsSource?: "finnhub" | "seed";
  opportunities: EnrichedOpportunity[];
};

type TrendState = { points: { date: string; value: number }[]; source: "live" | "sample" };
type SortKey = "signal" | "momentum" | "earnings" | "interest";

const STATUS_LABEL: Record<Status, string> = {
  watching: "Watching",
  positioned: "Positioned",
  passed: "Passed",
};

const WINDOWS: { label: string; weeks: number | null }[] = [
  { label: "Any", weeks: null },
  { label: "≤ 2w", weeks: 2 },
  { label: "≤ 4w", weeks: 4 },
  { label: "≤ 8w", weeks: 8 },
];

// One custom-ticker score result from /api/score.
type ScoreResult = {
  ticker: string;
  company: string;
  product: string;
  keyword: string;
  category: string;
  earningsDate: string | null;
  earningsTiming?: "am" | "pm";
  earningsTentative?: boolean;
  estimateEps?: number;
  epsHistory?: { label: string; estimate: number; actual: number }[];
  daysToEarnings: number | null;
  trend: { points: { date: string; value: number }[]; source: "live" | "sample" };
  latest: number;
  momentum: number;
  momentumPct: number;
  beat: number;
  signal: { score: number; acceleration: number; interest: number; conversion: number };
};

export default function Dashboard() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [trends, setTrends] = useState<Record<string, TrendState>>({});
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("signal");
  const [hideStatus, setHideStatus] = useState<Set<Status>>(new Set());
  const [windowWeeks, setWindowWeeks] = useState<number | null>(null);
  const { overrides, setOverride, clearAll } = useOverrides();
  const { custom, add, remove } = useCustom();
  const [scores, setScores] = useState<
    Record<string, ScoreResult | "loading" | "error">
  >({});
  const [form, setForm] = useState({ ticker: "", keyword: "", name: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/opportunities", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Feed = await res.json();
      setFeed(data);
      setError(null);
      data.opportunities.forEach(async (o) => {
        try {
          const r = await fetch(
            `/api/trends?keyword=${encodeURIComponent(o.keyword)}`,
            { cache: "no-store" },
          );
          if (!r.ok) return;
          const t = await r.json();
          if (Array.isArray(t.points) && t.points.length > 1)
            setTrends((p) => ({ ...p, [o.keyword]: { points: t.points, source: t.source } }));
        } catch {
          /* keep sample */
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Score any custom tickers we haven't scored yet.
  useEffect(() => {
    custom.forEach(async (spec) => {
      if (scores[spec.ticker]) return;
      setScores((p) => ({ ...p, [spec.ticker]: "loading" }));
      try {
        const qs = new URLSearchParams({
          ticker: spec.ticker,
          keyword: spec.keyword,
          ...(spec.name ? { name: spec.name } : {}),
        });
        const r = await fetch(`/api/score?${qs}`, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const data: ScoreResult = await r.json();
        setScores((p) => ({ ...p, [spec.ticker]: data }));
      } catch {
        setScores((p) => ({ ...p, [spec.ticker]: "error" }));
      }
    });
  }, [custom, scores]);

  // Seeded names → CardView (apply overrides, live trends, signal).
  const seededViews: CardView[] = useMemo(() => {
    if (!feed) return [];
    return feed.opportunities.map((base) => {
      const ov = overrides[base.ticker] ?? {};
      const o = {
        ...base,
        status: ov.status ?? base.status,
        conviction: ov.conviction ?? base.conviction,
        notes: ov.notes ?? base.notes,
      };
      const t = trends[o.keyword];
      const points = t?.points ?? o.sampleTrend;
      const source = t?.source ?? "sample";
      const { latest, momentum, momentumPct } = momentumOf(points);
      const beat = beatRate(o.epsHistory);
      const signal = computeSignal({ momentumPct, latest, beat });
      return { o, points, source, latest, momentum, momentumPct, beat, signal };
    });
  }, [feed, trends, overrides]);

  // Custom tickers → CardView.
  const customViews: CardView[] = useMemo(() => {
    return custom
      .map((spec) => scores[spec.ticker])
      .filter((s): s is ScoreResult => !!s && s !== "loading" && s !== "error")
      .map((s) => {
        const ov = overrides[s.ticker] ?? {};
        const o = {
          ticker: s.ticker,
          company: s.company,
          product: s.product,
          keyword: s.keyword,
          category: s.category,
          status: (ov.status ?? "watching") as Status,
          conviction: (ov.conviction ?? "medium") as Conviction,
          notes: ov.notes ?? "",
          earningsDate: s.earningsDate,
          earningsTiming: s.earningsTiming,
          earningsTentative: s.earningsTentative,
          estimateEps: s.estimateEps,
          epsHistory: s.epsHistory,
          daysToEarnings: s.daysToEarnings,
        };
        return {
          o,
          points: s.trend.points,
          source: s.trend.source,
          latest: s.latest,
          momentum: s.momentum,
          momentumPct: s.momentumPct,
          beat: s.beat,
          signal: s.signal,
          isCustom: true,
        };
      });
  }, [custom, scores, overrides]);

  const allViews = useMemo(
    () => [...customViews, ...seededViews],
    [customViews, seededViews],
  );

  const rows = useMemo(() => {
    let f = allViews.filter((v) => !hideStatus.has(v.o.status));
    if (windowWeeks != null)
      f = f.filter(
        (v) => v.o.daysToEarnings != null && v.o.daysToEarnings <= windowWeeks * 7,
      );
    const s = [...f];
    if (sort === "signal") s.sort((a, b) => b.signal.score - a.signal.score);
    if (sort === "momentum") s.sort((a, b) => b.momentum - a.momentum);
    if (sort === "earnings")
      s.sort(
        (a, b) => (a.o.daysToEarnings ?? 1e9) - (b.o.daysToEarnings ?? 1e9),
      );
    if (sort === "interest") s.sort((a, b) => b.latest - a.latest);
    return s;
  }, [allViews, sort, hideStatus, windowWeeks]);

  const liveCount = allViews.filter((v) => v.source === "live").length;
  const sampleCount = allViews.length - liveCount;
  const editCount = Object.keys(overrides).length;

  // Historical base rates from real EPS history across all tracked names.
  const base = useMemo(() => {
    let quarters = 0,
      beats = 0,
      surpriseSum = 0,
      accelBeats = 0,
      accelQ = 0,
      flatBeats = 0,
      flatQ = 0;
    for (const v of allViews) {
      const h = v.o.epsHistory;
      if (!h || h.length === 0) continue;
      const accel = v.momentumPct > 0;
      for (const q of h) {
        const beat = q.actual >= q.estimate;
        quarters++;
        if (beat) beats++;
        if (q.estimate !== 0)
          surpriseSum += (q.actual - q.estimate) / Math.abs(q.estimate);
        if (accel) {
          accelQ++;
          if (beat) accelBeats++;
        } else {
          flatQ++;
          if (beat) flatBeats++;
        }
      }
    }
    if (quarters === 0) return null;
    return {
      quarters,
      beats,
      beatRate: beats / quarters,
      avgSurprise: surpriseSum / quarters,
      accel: accelQ ? accelBeats / accelQ : null,
      flat: flatQ ? flatBeats / flatQ : null,
    };
  }, [allViews]);

  function toggleStatus(s: Status) {
    setHideStatus((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault();
    const res = add({ ticker: form.ticker, keyword: form.keyword, name: form.name });
    if (!res.ok) {
      setFormError(res.reason ?? "Couldn't add that.");
      return;
    }
    setFormError(null);
    setForm({ ticker: "", keyword: "", name: "" });
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <strong>{rows.length}</strong> opportunities
          {feed?.earningsSource && (
            <span
              className={`feed-badge ${feed.earningsSource === "finnhub" ? "live" : "seed"}`}
            >
              {feed.earningsSource === "finnhub" ? "earnings: live" : "earnings: seed"}
            </span>
          )}
        </div>
        <div className="controls">
          <label>
            Earnings
            <select
              value={windowWeeks ?? ""}
              onChange={(e) =>
                setWindowWeeks(e.target.value === "" ? null : Number(e.target.value))
              }
            >
              {WINDOWS.map((w) => (
                <option key={w.label} value={w.weeks ?? ""}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="signal">Signal score</option>
              <option value="momentum">Trend momentum</option>
              <option value="earnings">Days to earnings</option>
              <option value="interest">Current interest</option>
            </select>
          </label>
          <div className="chips">
            {(["watching", "positioned", "passed"] as Status[]).map((s) => (
              <button
                key={s}
                className={`chip ${hideStatus.has(s) ? "off" : "on"}`}
                onClick={() => toggleStatus(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Data-provenance banner: how much of the signal is real vs placeholder. */}
      {allViews.length > 0 && (
        <div className={`provenance-banner ${sampleCount > 0 ? "warn" : "ok"}`}>
          <span className="live-dot" />
          <strong>{liveCount}</strong> of {allViews.length} on live Google Trends
          {sampleCount > 0 && (
            <>
              {" · "}
              <strong>{sampleCount}</strong> on placeholder data (dimmed) — their
              Signal isn&apos;t trustworthy yet
            </>
          )}
        </div>
      )}

      {/* Add a custom stock. */}
      <form className="add-stock" onSubmit={submitCustom}>
        <input
          placeholder="Ticker (e.g. NKE)"
          value={form.ticker}
          onChange={(e) => setForm({ ...form, ticker: e.target.value })}
        />
        <input
          placeholder="Search keyword (e.g. nike)"
          value={form.keyword}
          onChange={(e) => setForm({ ...form, keyword: e.target.value })}
        />
        <input
          placeholder="Name (optional)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <button type="submit">Score it</button>
      </form>
      {formError && <p className="custom-status err">{formError}</p>}

      {base && (
        <div className="baserates" title="Historical base rates from real EPS history">
          <span>
            <strong>
              {base.beats}/{base.quarters}
            </strong>{" "}
            tracked prints beat ({Math.round(base.beatRate * 100)}%)
          </span>
          <span>
            avg surprise{" "}
            <strong className="pos">+{Math.round(base.avgSurprise * 100)}%</strong>
          </span>
          {base.accel != null && base.flat != null && (
            <span>
              accelerating names beat <strong>{Math.round(base.accel * 100)}%</strong>{" "}
              vs <strong>{Math.round(base.flat * 100)}%</strong> for flat/fading
            </span>
          )}
        </div>
      )}

      {error && <p className="error">⚠ {error}</p>}

      {/* Loading / error states for custom tickers. */}
      {custom.some((c) => scores[c.ticker] === "loading") && (
        <p className="custom-status">Scoring custom tickers…</p>
      )}
      {custom
        .filter((c) => scores[c.ticker] === "error")
        .map((c) => (
          <p key={c.ticker} className="custom-status err">
            Couldn&apos;t score {c.ticker} — check the ticker/keyword.{" "}
            <button onClick={() => remove(c.ticker)}>remove</button>
          </p>
        ))}

      <div className="cards">
        {rows.map((v) => (
          <Card
            key={v.o.ticker}
            view={v}
            onStatus={(s) => setOverride(v.o.ticker, { status: s })}
            onConviction={(c) => setOverride(v.o.ticker, { conviction: c })}
            onNote={(n) => setOverride(v.o.ticker, { notes: n })}
            onRemove={v.isCustom ? () => remove(v.o.ticker) : undefined}
          />
        ))}
      </div>

      <div className="panel-foot">
        <span>
          Edits (status, conviction, notes) and custom stocks save to this
          browser.
          {editCount > 0 && (
            <button className="reset" onClick={clearAll}>
              reset {editCount} edited
            </button>
          )}
        </span>
      </div>

      <details className="glossary">
        <summary>What the numbers mean</summary>
        <dl>
          <dt>Signal (0–100)</dt>
          <dd>
            How attractive the setup is: 50% search acceleration + 20% interest
            level + 30% earnings beat-rate. Strong ≥ 65, Mixed ≥ 45.
          </dd>
          <dt>Momentum</dt>
          <dd>
            Search acceleration — recent 3 months vs. the prior 3. Positive means
            the trend is bending up (you may be early).
          </dd>
          <dt>Interest</dt>
          <dd>Current search interest, 0–100 (Google-Trends style).</dd>
          <dt>live vs sample</dt>
          <dd>
            <strong>live</strong> = real Google Trends. <strong>sample</strong> =
            placeholder shape shown when Google rate-limits; don&apos;t trade it.
          </dd>
          <dt>EPS vs est</dt>
          <dd>Did the company beat (▲) or miss (▼) earnings estimates each quarter.</dd>
          <dt>±N% priced in</dt>
          <dd>
            The move options are pricing for the print (ATM straddle). High = a lot
            already expected; beware IV crush.
          </dd>
        </dl>
      </details>
    </section>
  );
}
