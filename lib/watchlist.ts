import path from "path";
import { Ticker } from "@/lib/providers/types";
import { readJson, writeJson, DATA_DIR } from "@/lib/db/jsonStore";

const WATCHLIST_FILE = path.join(DATA_DIR, "watchlist.json");

const DEFAULT_WATCHLIST: Ticker[] = [
  { symbol: "CELH", name: "Celsius Holdings", sector: "Consumer Staples" },
  { symbol: "ELF", name: "e.l.f. Beauty", sector: "Consumer Discretionary" },
  { symbol: "DECK", name: "Deckers Outdoor", sector: "Consumer Discretionary" },
  { symbol: "CAVA", name: "CAVA Group", sector: "Consumer Discretionary" },
  { symbol: "CROX", name: "Crocs Inc.", sector: "Consumer Discretionary" },
  { symbol: "DKNG", name: "DraftKings", sector: "Consumer Discretionary" },
  { symbol: "RBLX", name: "Roblox Corp.", sector: "Communication Services" },
  { symbol: "CMG", name: "Chipotle Mexican Grill", sector: "Consumer Discretionary" },
];

export async function getWatchlist(): Promise<Ticker[]> {
  const stored = await readJson<Ticker[]>(WATCHLIST_FILE);
  if (stored && stored.length) return stored;
  return DEFAULT_WATCHLIST;
}

export async function saveWatchlist(list: Ticker[]): Promise<void> {
  await writeJson(WATCHLIST_FILE, list);
}

export async function addTicker(t: Ticker): Promise<Ticker[]> {
  const list = await getWatchlist();
  const sym = t.symbol.toUpperCase();
  if (list.some((x) => x.symbol === sym)) return list;
  const next = [...list, { ...t, symbol: sym, watchedAt: new Date().toISOString() }];
  await saveWatchlist(next);
  return next;
}

export async function removeTicker(symbol: string): Promise<Ticker[]> {
  const list = await getWatchlist();
  const next = list.filter((x) => x.symbol !== symbol.toUpperCase());
  await saveWatchlist(next);
  return next;
}
