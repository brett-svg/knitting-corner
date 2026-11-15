// 24h cache for Ravelry lookups, so repeat page views don't spend our
// Ravelry rate limit. Backed by the `ravelry_cache` table when there's a
// database; demo mode falls back to an in-process map.

import { lt, sql } from "drizzle-orm";
import { db, hasDb, schema } from "@/lib/db";

export const RAVELRY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const memory = new Map<string, { at: number; payload: unknown }>();

async function read<T>(key: string): Promise<T | undefined> {
  const fresh = (at: number) => Date.now() - at < RAVELRY_CACHE_TTL_MS;
  if (!hasDb()) {
    const hit = memory.get(key);
    return hit && fresh(hit.at) ? (hit.payload as T) : undefined;
  }
  try {
    const row = await db().query.ravelryCache.findFirst({
      where: (t, { eq }) => eq(t.key, key),
    });
    return row && fresh(row.fetchedAt.getTime()) ? (row.payload as T) : undefined;
  } catch (err) {
    // A cache failure (e.g. migration not applied yet) shouldn't break the page.
    console.warn("[ravelry-cache] read failed:", err);
    return undefined;
  }
}

async function write(key: string, payload: unknown): Promise<void> {
  if (!hasDb()) {
    memory.set(key, { at: Date.now(), payload });
    return;
  }
  try {
    const t = schema.ravelryCache;
    await db()
      .insert(t)
      .values({ key, payload, fetchedAt: new Date() })
      .onConflictDoUpdate({ target: t.key, set: { payload, fetchedAt: sql`now()` } });
    await db()
      .delete(t)
      .where(lt(t.fetchedAt, new Date(Date.now() - RAVELRY_CACHE_TTL_MS)));
  } catch (err) {
    console.warn("[ravelry-cache] write failed:", err);
  }
}

// Returns the cached value for `key`, or runs `load` and caches its result.
// Errors from `load` are not cached.
export async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = await read<T>(key);
  if (hit !== undefined) return hit;
  const value = await load();
  await write(key, value);
  return value;
}
