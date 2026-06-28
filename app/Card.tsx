"use client";

import { useState } from "react";
import type {
  Conviction,
  EpsQuarter,
  Status,
  TrendPoint,
} from "@/lib/types";
import type { SignalBreakdown } from "@/lib/signal";
import { makeVerdict } from "@/lib/verdict";
import Sparkline from "./Sparkline";

export type CardOpp = {
  ticker: string;
  company: string;
  product: string;
  keyword: string;
  category: string;
  status: Status;
  conviction: Conviction;
  notes: string;
  earningsDate: string | null;
  earningsTiming?: "am" | "pm";
  earningsTentative?: boolean;
  estimateEps?: number;
  epsHistory?: EpsQuarter[];
  options?: { expectedMovePct: number; iv: number; asOf: string };
  daysToEarnings: number | null;
};

export type CardView = {
  o: CardOpp;
  points: TrendPoint[];
  source: "live" | "sample";
  latest: number;
  momentum: number;
  momentumPct: number;
  beat: number;
  signal: SignalBreakdown;
  isCustom?: boolean;
};

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

// On-demand TikTok activity score (Apify). Only runs on click to save credits.
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
      if (!res.ok || data.score == null) return setState("unavailable");
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
    <button className="tiktok btn" onClick={check} disabled={state === "loading"}>
      {state === "loading" ? "checking…" : "check TikTok"}
    </button>
  );
}

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

export default function Card({
  view,
  onStatus,
  onConviction,
  onNote,
  onRemove,
}: {
  view: CardView;
  onStatus: (s: Status) => void;
  onConviction: (c: Conviction) => void;
  onNote: (n: string) => void;
  onRemove?: () => void;
}) {
  const { o, signal } = view;
  const soon = o.daysToEarnings != null && o.daysToEarnings <= 30;
  const hasTrend = view.points.length >= 2;
  const beatsCount = o.epsHistory
    ? o.epsHistory.filter((q) => q.actual >= q.estimate).length
    : 0;
  const verdict = makeVerdict({
    signalScore: signal.score,
    momentumPct: view.momentumPct,
    latest: view.latest,
    beatsCount,
    quarters: o.epsHistory?.length ?? 0,
    daysToEarnings: o.daysToEarnings,
    expectedMovePct: o.options?.expectedMovePct,
    hasTrend,
  });

  return (
    <article className={`card ${view.source === "sample" ? "is-sample" : ""}`}>
      <div className="card-signal">
        <span
          className={`signal-score tier-${verdict.tier.toLowerCase()}`}
          title={`Acceleration ${signal.acceleration} · Interest ${signal.interest} · Conversion ${signal.conversion}`}
        >
          {signal.score}
        </span>
        <span className="signal-label">{verdict.tier}</span>
      </div>

      <div className="card-main">
        <div className="ident">
          <span className="ticker">{o.ticker}</span>
          <span className="company">{o.company}</span>
          {view.isCustom && <span className="custom-tag">custom</span>}
          <button
            className={`status ${o.status}`}
            title="Click to change status"
            onClick={() => onStatus(nextIn(STATUS_CYCLE, o.status))}
          >
            {STATUS_LABEL[o.status]}
          </button>
          {onRemove && (
            <button className="remove" title="Remove" onClick={onRemove}>
              ✕
            </button>
          )}
        </div>

        <p className="verdict">{verdict.line}</p>
        <div className="drivers">
          {verdict.chips.map((c) => (
            <span key={c.label} className={`driver ${c.tone}`}>
              {c.label}
            </span>
          ))}
        </div>

        <div className="product">
          <span className="dot-trend" /> {o.product}
          <span className="cat">{o.category}</span>
        </div>

        <EditableNote value={o.notes} onSave={onNote} />

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
        {hasTrend ? (
          <>
            <Sparkline points={view.points} />
            <div className="trend-stats">
              <span
                className={`mom ${view.momentum >= 0 ? "pos" : "neg"}`}
                title="Recent 3-mo avg vs. prior 3-mo avg"
              >
                {signedPct(view.momentumPct)} momentum
              </span>
              <span className="interest">
                interest {view.latest}/100
                <span className={`src ${view.source}`}>
                  {view.source === "live" ? " · live" : " · sample"}
                </span>
              </span>
              <TikTokScore keyword={o.keyword} />
            </div>
          </>
        ) : (
          <div className="trend-stats">
            <span className="no-trend">no trend data</span>
            <TikTokScore keyword={o.keyword} />
          </div>
        )}
      </div>

      <div className="card-earn">
        {o.daysToEarnings != null ? (
          <>
            <span className={`countdown ${soon ? "soon" : ""}`}>
              {o.daysToEarnings}d
            </span>
            <span className="earn-label">
              to earnings
              <br />
              {o.earningsDate ? fmtDate(o.earningsDate) : ""}
              {o.earningsTiming ? ` ${o.earningsTiming}` : ""}
              {o.earningsTentative ? "*" : ""}
              {typeof o.estimateEps === "number" && (
                <>
                  <br />
                  est EPS ${o.estimateEps.toFixed(2)}
                </>
              )}
            </span>
          </>
        ) : (
          <span className="earn-label">no earnings date</span>
        )}
        {o.options && (
          <span
            className="exp-move"
            title={`Options-implied move · ATM IV ${Math.round(
              o.options.iv * 100,
            )}% · as of ${o.options.asOf}`}
          >
            ±{Math.round(o.options.expectedMovePct * 100)}% priced in
          </span>
        )}
        <button
          className={`conv ${o.conviction}`}
          title="Click to change conviction"
          onClick={() => onConviction(nextIn(CONV_CYCLE, o.conviction))}
        >
          {o.conviction}
        </button>
      </div>
    </article>
  );
}
