"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Conviction,
  EnrichedOpportunity,
  Status,
  TrendPoint,
} from "@/lib/types";
import { momentumOf } from "@/lib/enrich";
import { beatRate, computeSignal } from "@/lib/signal";
import { useOverrides } from "./useOverrides";
import Sparkline from "./Sparkline";

type Feed = {
  asOf: string;
  count: number;
  earningsSource?: "finnhub" | "seed";
  opportunities: EnrichedOpportunity[];
};

type TrendState = { points: TrendPoint[]; source: "live" | "sample" };

type SortKey = "signal" | "momentum" | "earnings" | "interest";

const STATUS_LABEL: Record<Status, string> = {
  watching: "Watching",
  positioned: "Positioned",
  passed: "Passed",
};

const STATUS_CYCLE: Status[] = ["watching", "positioned", "passed"];
const CONV_CYCLE: Conviction[] = ["low", "medium", "high"];

function nextIn<T>(cycle: T[], current: T): T {
  const i = cycle.indexOf(current);
  return cycle[(i + 1) % cycle.length];
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function signedPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(0)}%`;
}

// On-demand TikTok activity score. Calls Apify (via /api/social) only when the
// user clicks, so we don't burn Apify credits on every page load.
function TikTokScore({ keyword }: { keyword: string }) {
  const [state, setState] = useState<
    "idle" | "loading" | "done" | "unavailable"
  >("idle");
  const [score, setScore] = useState<number | null>(null);

  async function check() {
    setState("loading");
    try {
      const res = await fetch(
        `/api/social?keyword=${encodeURIComponent(keyword)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok || data.score == null) {
        setState("unavailable");
        return;
      }
      setScore(data.score);
      setState("done");
    } catch {
      setState("unavailable");
    }
  }

  if (state === "done")
    return <span className="tiktok done">TikTok {score}/100</span>;
  if (state === "unavailable")
    return (
      <span className="tiktok off" title="Set APIFY_TOKEN to enable">
        TikTok n/a
      </span>
    );

  return (
    <button
      className="tiktok btn"
      onClick={check}
      disabled={state === "loading"}
    >
      {state === "loading" ? "checking…" : "check TikTok"}
    </button>
  );
}

// Inline-editable note, saved to localStorage on blur.
function EditableNote({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <textarea
        className="note-edit"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onSave(draft);
        }}
      />
    );
  }
  return (
    <p
      className="notes editable"
      title="Click to edit"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value || <span className="note-empty">+ add a note</span>}
    </p>
  );
}

const WINDOWS: { label: string; weeks: number | null }[] = [
  { label: "Any", weeks: null },
  { label: "≤ 2w", weeks: 2 },
  { label: "≤ 4w", weeks: 4 },
  { label: "≤ 8w", weeks: 8 },
];

export default function Dashboard() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [trends, setTrends] = useState<Record<string, TrendState>>({});
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("signal");
  const [hideStatus, setHideStatus] = useState<Set<Status>>(new Set());
  const [windowWeeks, setWindowWeeks] = useState<number | null>(null);
  const { overrides, setOverride, clearAll } = useOverrides();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/opportunities", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Feed = await res.json();
      setFeed(data);
      setError(null);

      // Upgrade each card's trend to live Google Trends in the background.
      data.opportunities.forEach(async (o) => {
        try {
          const r = await fetch(
            `/api/trends?keyword=${encodeURIComponent(o.keyword)}`,
            { cache: "no-store" },
          );
          if (!r.ok) return;
          const t = await r.json();
          if (Array.isArray(t.points) && t.points.length > 1) {
            setTrends((prev) => ({
              ...prev,
              [o.keyword]: { points: t.points, source: t.source },
            }));
          }
        } catch {
          /* keep seed sample */
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Apply user overrides, live trends, momentum and the composite signal.
  const views = useMemo(() => {
    if (!feed) return [];
    return feed.opportunities.map((base) => {
      const ov = overrides[base.ticker] ?? {};
      const o: EnrichedOpportunity = {
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

  const rows = useMemo(() => {
    let filtered = views.filter((v) => !hideStatus.has(v.o.status));
    if (windowWeeks != null)
      filtered = filtered.filter((v) => v.o.daysToEarnings <= windowWeeks * 7);
    const sorted = [...filtered];
    if (sort === "signal") sorted.sort((a, b) => b.signal.score - a.signal.score);
    if (sort === "momentum") sorted.sort((a, b) => b.momentum - a.momentum);
    if (sort === "earnings")
      sorted.sort((a, b) => a.o.daysToEarnings - b.o.daysToEarnings);
    if (sort === "interest") sorted.sort((a, b) => b.latest - a.latest);
    return sorted;
  }, [views, sort, hideStatus, windowWeeks]);

  function toggleStatus(s: Status) {
    setHideStatus((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const editCount = Object.keys(overrides).length;

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <strong>{rows.length}</strong> opportunities
          {feed?.earningsSource && (
            <span
              className={`feed-badge ${feed.earningsSource === "finnhub" ? "live" : "seed"}`}
              title={
                feed.earningsSource === "finnhub"
                  ? "Earnings pulled live from Finnhub"
                  : "Earnings from seeded data (set FINNHUB_API_KEY for live)"
              }
            >
              {feed.earningsSource === "finnhub"
                ? "earnings: live"
                : "earnings: seed"}
            </span>
          )}
        </div>
        <div className="controls">
          <label>
            Earnings
            <select
              value={windowWeeks ?? ""}
              onChange={(e) =>
                setWindowWeeks(
                  e.target.value === "" ? null : Number(e.target.value),
                )
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
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
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

      {error && <p className="error">⚠ {error}</p>}

      <div className="cards">
        {rows.map((v) => {
          const o = v.o;
          const soon = o.daysToEarnings <= 30;
          return (
            <article key={o.ticker} className="card">
              <div className="card-signal">
                <span
                  className="signal-score"
                  title={`Acceleration ${v.signal.acceleration} · Interest ${v.signal.interest} · Conversion ${v.signal.conversion} (beat rate ${Math.round(
                    v.beat * 100,
                  )}%)`}
                >
                  {v.signal.score}
                </span>
                <span className="signal-label">signal</span>
              </div>

              <div className="card-main">
                <div className="ident">
                  <span className="ticker">{o.ticker}</span>
                  <span className="company">{o.company}</span>
                  <button
                    className={`status ${o.status}`}
                    title="Click to change status"
                    onClick={() =>
                      setOverride(o.ticker, {
                        status: nextIn(STATUS_CYCLE, o.status),
                      })
                    }
                  >
                    {STATUS_LABEL[o.status]}
                  </button>
                </div>
                <div className="product">
                  <span className="dot-trend" /> {o.product}
                  <span className="cat">{o.category}</span>
                </div>

                <EditableNote
                  value={o.notes}
                  onSave={(notes) => setOverride(o.ticker, { notes })}
                />

                {o.epsHistory && o.epsHistory.length > 0 && (
                  <div className="track">
                    <span className="track-label">EPS vs est</span>
                    {o.epsHistory.map((q) => {
                      const beat = q.actual >= q.estimate;
                      return (
                        <span
                          key={q.label}
                          className={`pill ${beat ? "beat" : "miss"}`}
                          title={`${q.label}: actual ${q.actual} vs est ${q.estimate}`}
                        >
                          {q.label.split(" ")[0]} {beat ? "▲" : "▼"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card-trend">
                <Sparkline points={v.points} />
                <div className="trend-stats">
                  <span
                    className={`mom ${v.momentum >= 0 ? "pos" : "neg"}`}
                    title="Recent 3-mo avg vs. prior 3-mo avg"
                  >
                    {signedPct(v.momentumPct)} momentum
                  </span>
                  <span className="interest">
                    interest {v.latest}/100
                    <span className={`src ${v.source}`}>
                      {v.source === "live" ? " · live" : " · sample"}
                    </span>
                  </span>
                  <TikTokScore keyword={o.keyword} />
                </div>
              </div>

              <div className="card-earn">
                <span className={`countdown ${soon ? "soon" : ""}`}>
                  {o.daysToEarnings}d
                </span>
                <span className="earn-label">
                  to earnings
                  <br />
                  {fmtDate(o.earningsDate)}
                  {o.earningsTiming ? ` ${o.earningsTiming}` : ""}
                  {o.earningsTentative ? "*" : ""}
                  {typeof o.estimateEps === "number" && (
                    <>
                      <br />
                      est EPS ${o.estimateEps.toFixed(2)}
                    </>
                  )}
                </span>
                <button
                  className={`conv ${o.conviction}`}
                  title="Click to change conviction"
                  onClick={() =>
                    setOverride(o.ticker, {
                      conviction: nextIn(CONV_CYCLE, o.conviction),
                    })
                  }
                >
                  {o.conviction}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="panel-foot">
        <span>
          Edits (status, conviction, notes) save to this browser.
          {editCount > 0 && (
            <button className="reset" onClick={clearAll}>
              reset {editCount} edited
            </button>
          )}
        </span>
      </div>

      <p className="provenance">
        <strong>Signal</strong> = 50% search acceleration + 20% interest level +
        30% earnings beat-rate (hover the number for the breakdown). Earnings,
        EPS estimates and beat/miss history are real market data; trend lines use
        live Google Trends where available (<code>live</code>) and fall back to a
        seeded <code>sample</code> when Google rate-limits.
      </p>
    </section>
  );
}
