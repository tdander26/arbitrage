"use client";

import { useCallback, useEffect, useState } from "react";

// User-added tickers, persisted in the browser. Each is scored on the fly via
// /api/score (real Finnhub earnings + Google Trends).
export type CustomSpec = {
  ticker: string;
  keyword: string;
  name?: string;
};

const KEY = "arb.custom.v1";

// Cap custom tickers so trend lookups stay well within the SerpApi free quota.
export const MAX_CUSTOM = 15;

export function useCustom() {
  const [custom, setCustom] = useState<CustomSpec[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCustom(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: CustomSpec[]) => {
    setCustom(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const add = useCallback(
    (spec: CustomSpec): { ok: boolean; reason?: string } => {
      const ticker = spec.ticker.trim().toUpperCase();
      if (!ticker || !spec.keyword.trim())
        return { ok: false, reason: "Enter a ticker and keyword." };
      const exists = custom.some((c) => c.ticker === ticker);
      if (!exists && custom.length >= MAX_CUSTOM)
        return {
          ok: false,
          reason: `Limit of ${MAX_CUSTOM} custom stocks reached (keeps trend lookups within the free quota). Remove one first.`,
        };
      // Replace if the ticker already exists.
      const next = [
        { ...spec, ticker },
        ...custom.filter((c) => c.ticker !== ticker),
      ];
      persist(next);
      return { ok: true };
    },
    [custom, persist],
  );

  const remove = useCallback(
    (ticker: string) => persist(custom.filter((c) => c.ticker !== ticker)),
    [custom, persist],
  );

  return { custom, add, remove };
}
