"use client";

import { useCallback, useEffect, useState } from "react";
import type { Conviction, Status } from "@/lib/types";

// Per-ticker user edits persisted in the browser. This is single-device
// persistence (localStorage); cross-device sync would need a backing DB.
export type Override = {
  status?: Status;
  conviction?: Conviction;
  notes?: string;
  // Snapshot captured when a name is marked Positioned — your forward record.
  entry?: {
    signal: number;
    date: string;
    interest: number;
    momentumPct: number;
    price?: number;
  };
};

export type Overrides = Record<string, Override>;

const KEY = "arb.overrides.v1";

export function useOverrides() {
  const [overrides, setOverrides] = useState<Overrides>({});
  const [loaded, setLoaded] = useState(false);

  // Hydrate from localStorage on mount (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setOverrides(JSON.parse(raw));
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Overrides) => {
    setOverrides(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full / unavailable */
    }
  }, []);

  const setOverride = useCallback(
    (ticker: string, patch: Override) => {
      persist({
        ...overrides,
        [ticker]: { ...overrides[ticker], ...patch },
      });
    },
    [overrides, persist],
  );

  const clearAll = useCallback(() => persist({}), [persist]);

  return { overrides, setOverride, clearAll, loaded };
}
