// Turn the Signal components into a one-line, plain-language read and a few
// driver chips, so the card is understandable without interpreting 8 numbers.

export type VerdictInput = {
  signalScore: number; // 0–100
  momentumPct: number; // search acceleration
  latest: number; // current interest 0–100
  beatsCount: number; // quarters beaten
  quarters: number; // quarters with history
  daysToEarnings: number | null;
  expectedMovePct?: number; // options-implied, if known
  hasTrend?: boolean; // false when no trend data is available at all
  scored?: boolean; // false when trend is placeholder (not live) — don't score
  extended?: boolean; // latest near its 12-mo high — may already have run up
};

export type Chip = { label: string; tone: "good" | "bad" | "neutral" };

export type Verdict = {
  tier: "Strong" | "Mixed" | "Weak" | "Unscored";
  line: string;
  chips: Chip[];
};

export function makeVerdict(v: VerdictInput): Verdict {
  // A card is only "scored" when its trend is real live data. On placeholder
  // or missing trend, we refuse to present an authoritative Signal — the rest
  // of the card (earnings, beats, expected move) is still real and shown.
  const trustworthy = v.hasTrend !== false && v.scored !== false;

  if (!trustworthy) {
    const parts: string[] = [
      v.hasTrend === false
        ? "no live trend data — Signal not scored"
        : "placeholder trend (search rate-limited) — Signal not scored",
    ];
    if (v.quarters > 0)
      parts.push(
        v.beatsCount === v.quarters
          ? `beats all ${v.quarters}`
          : `beat ${v.beatsCount}/${v.quarters}`,
      );
    const chips: Chip[] = [
      {
        label: v.hasTrend === false ? "no trend data" : "not scored",
        tone: "neutral",
      },
    ];
    if (v.quarters > 0)
      chips.push({
        label: `beats ${v.beatsCount}/${v.quarters}`,
        tone:
          v.beatsCount / v.quarters >= 0.75
            ? "good"
            : v.beatsCount / v.quarters >= 0.5
              ? "neutral"
              : "bad",
      });
    if (v.daysToEarnings != null)
      chips.push({
        label:
          v.daysToEarnings < 0
            ? "earnings passed"
            : `${v.daysToEarnings}d to earnings`,
        tone: "neutral",
      });
    return { tier: "Unscored", line: parts.join(" · "), chips };
  }

  const tier =
    v.signalScore >= 65 ? "Strong" : v.signalScore >= 45 ? "Mixed" : "Weak";

  // Search phrase from acceleration (or honesty when no data exists).
  let search: string;
  if (v.hasTrend === false) search = "no trend data yet";
  else if (v.momentumPct >= 0.1) search = "search accelerating";
  else if (v.momentumPct > 0.02) search = "search ticking up";
  else if (v.momentumPct <= -0.05) search = "search fading";
  else search = "search flat";

  const parts: string[] = [search];

  if (v.quarters > 0) {
    if (v.beatsCount === v.quarters)
      parts.push(`beats all ${v.quarters}`);
    else parts.push(`beat ${v.beatsCount}/${v.quarters}`);
  }

  if (v.extended) parts.push("but extended (near 12-mo high)");

  if (typeof v.expectedMovePct === "number" && v.expectedMovePct >= 0.15) {
    parts.push(`±${Math.round(v.expectedMovePct * 100)}% already priced in`);
  }

  const line = parts.join(" · ");

  const chips: Chip[] = [];
  if (v.hasTrend === false) {
    chips.push({ label: "no trend data", tone: "neutral" });
  } else {
    chips.push(
      {
        label:
          v.momentumPct >= 0.02
            ? "↑ accelerating"
            : v.momentumPct <= -0.05
              ? "↓ fading"
              : "→ flat",
        tone:
          v.momentumPct >= 0.02 ? "good" : v.momentumPct <= -0.05 ? "bad" : "neutral",
      },
      {
        label: `interest ${v.latest}`,
        tone: v.latest >= 60 ? "good" : v.latest >= 35 ? "neutral" : "bad",
      },
    );
  }

  if (v.quarters > 0) {
    chips.push({
      label: `beats ${v.beatsCount}/${v.quarters}`,
      tone:
        v.beatsCount / v.quarters >= 0.75
          ? "good"
          : v.beatsCount / v.quarters >= 0.5
            ? "neutral"
            : "bad",
    });
  }

  if (v.daysToEarnings != null) {
    chips.push({
      label:
        v.daysToEarnings < 0
          ? "earnings passed"
          : `${v.daysToEarnings}d to earnings`,
      tone: "neutral",
    });
  }

  if (v.extended) chips.push({ label: "extended", tone: "bad" });

  return { tier, line, chips };
}
