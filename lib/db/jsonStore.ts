import { promises as fs } from "fs";
import path from "path";

/**
 * Minimal JSON file store. Reads from data/cache (real seeded data) and
 * data/seed (committed demo data). Structured so it can be swapped for SQLite
 * or Vercel KV later without changing callers.
 */

const ROOT = process.cwd();
export const CACHE_DIR = path.join(ROOT, "data", "cache");
export const DATA_DIR = path.join(ROOT, "data");

export async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

/** Read a per-symbol cached bundle slice, e.g. cache/AAPL.price.json */
export async function readCache<T>(symbol: string, kind: string): Promise<T | null> {
  return readJson<T>(path.join(CACHE_DIR, `${symbol.toUpperCase()}.${kind}.json`));
}

export async function writeCache(symbol: string, kind: string, data: unknown): Promise<void> {
  await writeJson(path.join(CACHE_DIR, `${symbol.toUpperCase()}.${kind}.json`), data);
}
