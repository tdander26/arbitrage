"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { Conviction, EnrichedOpportunity, Status } from "@/lib/types";
import { trendStats } from "@/lib/enrich";
import {
  beatRate,
  meaningfulBeatRate,
  computeSignal,
  type SignalBreakdown,
} from "@/lib/signal";
import { useOverrides } from "./useOverrides";
import { useCustom } from "./useCustom";
import Card, { type CardView } from "./Card";

type Feed = {
  asOf: string;
  count: number;
  earningsSource?: "finnhub" | "seed" | "degraded";
  liveEarningsCount?: number;
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
  price?: number;
  daysToEarnings: number | null;
  trend: { points: { date: string; value: number }[]; source: "live" | "sample" };
  latest: number;
  momentum: number;
  momentumPct: number;
  yoyPct?: number | null;
  isYoY?: boolean;
  extended?: boolean;
  beat: number;
  signal: SignalBreakdown;
};

export default function Dashboard() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [trends, setTrends] = useState<Record<string, TrendState>>({});
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("signal");
  const [hideStatus, setHideStatus] = useState<Set<Status>>(new Set());
  const [windowWeeks, setWindowWeeks] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const { overrides, setOverride, clearAll } = useOverrides();
  const { custom, add, remove } = useCustom();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const priceInFlight = useRef<Set<string>>(new Set());

  async function fetchQuote(ticker: string): Promise<number | undefined> {
    try {
      const r = await fetch(`/api/quote?ticker=${encodeURIComponent(ticker)}`, {
        cache: "no-store",
      });
      const d = await r.json();
      if (typeof d.price === "number") {
        setPrices((p) => ({ ...p, [ticker]: d.price }));
        return d.price;
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }
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

  // Score any custom tickers we haven't scored yet. An in-flight ref (not the
  // `scores` state) is the guard, so this can't double-fetch a ticker or storm
  // the scoring endpoint when state updates re-run the effect.
  const inFlight = useRef<Set<string>>(new Set());
  useEffect(() => {
    custom.forEach(async (spec) => {
      if (scores[spec.ticker] || inFlight.current.has(spec.ticker)) return;
      inFlight.current.add(spec.ticker);
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
      } finally {
        inFlight.current.delete(spec.ticker);
      }
    });
    // Only re-run when the custom list changes, not on every score update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custom]);

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
        entry: ov.entry,
        price: prices[base.ticker],
      };
      const t = trends[o.keyword];
      const points = t?.points ?? o.sampleTrend;
      const source = t?.source ?? "sample";
      const st = trendStats(points);
      const beat = beatRate(o.epsHistory);
      const signal = computeSignal({
        momentumPct: st.momentumPct,
        latest: st.latest,
        beat: meaningfulBeatRate(o.epsHistory),
        expectedMovePct: o.options?.expectedMovePct,
      });
      return {
        o,
        points,
        source,
        latest: st.latest,
        momentum: st.momentum,
        momentumPct: st.momentumPct,
        yoyPct: st.yoyPct,
        isYoY: st.isYoY,
        extended: st.extended,
        beat,
        signal,
      };
    });
  }, [feed, trends, overrides, prices]);

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
          entry: ov.entry,
          earningsDate: s.earningsDate,
          earningsTiming: s.earningsTiming,
          earningsTentative: s.earningsTentative,
          estimateEps: s.estimateEps,
          epsHistory: s.epsHistory,
          price: prices[s.ticker] ?? s.price,
          daysToEarnings: s.daysToEarnings,
        };
        return {
          o,
          points: s.trend.points,
          source: s.trend.source,
          latest: s.latest,
          momentum: s.momentum,
          momentumPct: s.momentumPct,
          yoyPct: s.yoyPct,
          isYoY: s.isYoY,
          extended: s.extended,
          beat: s.beat,
          signal: s.signal,
          isCustom: true,
        };
      });
  }, [custom, scores, overrides, prices]);

  const allViews = useMemo(
    () => [...customViews, ...seededViews],
    [customViews, seededViews],
  );

  // Fetch a current price for each Positioned name so the journal can show
  // return-since-entry. Guarded by a ref so it fetches once per ticker.
  useEffect(() => {
    for (const v of allViews) {
      const tk = v.o.ticker;
      if (v.o.status !== "positioned") continue;
      if (prices[tk] != null || priceInFlight.current.has(tk)) continue;
      priceInFlight.current.add(tk);
      fetchQuote(tk).finally(() => priceInFlight.current.delete(tk));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allViews]);

  const categories = useMemo(
    () => Array.from(new Set(allViews.map((v) => v.o.category))).sort(),
    [allViews],
  );

  const rows = useMemo(() => {
    let f = allViews.filter((v) => !hideStatus.has(v.o.status));
    if (windowWeeks != null)
      f = f.filter(
        (v) =>
          v.o.daysToEarnings != null &&
          v.o.daysToEarnings >= 0 &&
          v.o.daysToEarnings <= windowWeeks * 7,
      );
    if (category) f = f.filter((v) => v.o.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      f = f.filter(
        (v) =>
          v.o.ticker.toLowerCase().includes(q) ||
          v.o.company.toLowerCase().includes(q) ||
          v.o.product.toLowerCase().includes(q),
      );
    }
    const s = [...f];
    // Placeholder-trend cards have fabricated momentum/interest/signal, so they
    // must sink to the bottom in EVERY trend-based sort — not just the Signal
    // one — so they never outrank genuinely live-scored names.
    const live = (v: CardView) => v.source === "live";
    const by = (v: CardView, val: number) => (live(v) ? val : -Infinity);
    if (sort === "signal")
      s.sort((a, b) => by(b, b.signal.score) - by(a, a.signal.score));
    if (sort === "momentum")
      s.sort((a, b) => by(b, b.momentum) - by(a, a.momentum));
    if (sort === "earnings")
      s.sort(
        (a, b) => (a.o.daysToEarnings ?? 1e9) - (b.o.daysToEarnings ?? 1e9),
      );
    if (sort === "interest")
      s.sort((a, b) => by(b, b.latest) - by(a, a.latest));
    return s;
  }, [allViews, sort, hideStatus, windowWeeks, category, query]);

  // Marking a name Positioned snapshots the current Signal + entry PRICE as the
  // record — but ONLY when the card is actually scored (live trend).
  async function setStatus(view: CardView, s: Status) {
    const scored = view.source === "live" && view.points.length >= 2;
    if (s === "positioned" && scored && !overrides[view.o.ticker]?.entry) {
      // Capture a fresh entry price (fetch if we don't already have one).
      const price = view.o.price ?? (await fetchQuote(view.o.ticker));
      setOverride(view.o.ticker, {
        status: s,
        entry: {
          signal: view.signal.score,
          date: new Date().toISOString().slice(0, 10),
          interest: view.latest,
          momentumPct: view.momentumPct,
          price,
        },
      });
    } else {
      setOverride(view.o.ticker, { status: s });
    }
  }

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
      // beat-rate / surprise use real EPS history for every name; the
      // accelerating-vs-flat split depends on momentum, so only bucket names
      // with a LIVE trend (placeholder momentum would taint the stat).
      const liveTrend = v.source === "live";
      const accel = v.momentumPct > 0;
      for (const q of h) {
        const beat = q.actual >= q.estimate;
        quarters++;
        if (beat) beats++;
        if (q.estimate !== 0)
          surpriseSum += (q.actual - q.estimate) / Math.abs(q.estimate);
        if (!liveTrend) continue;
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
              className={`feed-badge ${feed.earningsSource === "finnhub" ? "live" : feed.earningsSource === "degraded" ? "warn" : "seed"}`}
              title={
                feed.earningsSource === "finnhub"
                  ? `${feed.liveEarningsCount ?? 0} of ${feed.count} earnings live from Finnhub`
                  : feed.earningsSource === "degraded"
                    ? "Finnhub key set but calls failed/rate-limited — showing seeded dates"
                    : "No Finnhub key — showing seeded dates"
              }
            >
              {feed.earningsSource === "finnhub"
                ? `earnings: live (${feed.liveEarningsCount}/${feed.count})`
                : feed.earningsSource === "degraded"
                  ? "earnings: degraded"
                  : "earnings: seed"}
            </span>
          )}
        </div>
        <div className="controls">
          <input
            className="search"
            type="search"
            placeholder="Search ticker / product…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
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
            <span className="chips-label">Show</span>
            {(["watching", "positioned", "passed"] as Status[]).map((s) => (
              <button
                key={s}
                className={`chip ${hideStatus.has(s) ? "off" : "on"}`}
                title={hideStatus.has(s) ? `Show ${STATUS_LABEL[s]}` : `Hide ${STATUS_LABEL[s]}`}
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

      {!feed && !error ? (
        <p className="empty-state">Loading opportunities…</p>
      ) : rows.length === 0 ? (
        <p className="empty-state">
          No matches. Try clearing the search, category, or earnings-window
          filters — or re-enable a hidden status above.
        </p>
      ) : (
        <div className="cards">
          {rows.map((v) => (
            <Card
              key={v.o.ticker}
              view={v}
              onStatus={(s) => setStatus(v, s)}
              onConviction={(c) => setOverride(v.o.ticker, { conviction: c })}
              onNote={(n) => setOverride(v.o.ticker, { notes: n })}
              onRemove={v.isCustom ? () => remove(v.o.ticker) : undefined}
            />
          ))}
        </div>
      )}

      <div className="panel-foot">
        <span>
          Edits (status, conviction, notes) and custom stocks save to this
          browser.
          {editCount > 0 && (
            <button
              className="reset"
              onClick={() => {
                if (
                  confirm(
                    `Clear all ${editCount} edited names (status, conviction, notes, and Positioned entry records)? This can't be undone.`,
                  )
                )
                  clearAll();
              }}
            >
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
