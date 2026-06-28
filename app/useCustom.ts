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
    (spec: CustomSpec) => {
      const ticker = spec.ticker.trim().toUpperCase();
      if (!ticker || !spec.keyword.trim()) return;
      // Replace if the ticker already exists.
      const next = [
        { ...spec, ticker },
        ...custom.filter((c) => c.ticker !== ticker),
      ];
      persist(next);
    },
    [custom, persist],
  );

  const remove = useCallback(
    (ticker: string) => persist(custom.filter((c) => c.ticker !== ticker)),
    [custom, persist],
  );

  return { custom, add, remove };
}
