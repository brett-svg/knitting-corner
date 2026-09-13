// Thin client for the Ravelry yarn database.
// Auth: a "basic auth, read-only" app from https://www.ravelry.com/pro/developer
// gives you an access key + secret; those go in RAVELRY_USERNAME / RAVELRY_PASSWORD.

import type { WeightCategory } from "@/lib/mock";
import type { RavelryYarn } from "@/lib/yarn-label";

export type { RavelryYarn };

const BASE = "https://api.ravelry.com";
const UA = "knitting-corner (private stash app)";

// Ravelry's weight names are finer-grained than the app's enum.
const WEIGHT_MAP: Record<string, WeightCategory> = {
  thread: "Lace",
  cobweb: "Lace",
  lace: "Lace",
  "light fingering": "Fingering",
  fingering: "Fingering",
  sport: "Sport",
  dk: "DK",
  worsted: "Worsted",
  aran: "Aran",
  bulky: "Bulky",
  "super bulky": "Bulky",
  jumbo: "Bulky",
};

export function mapRavelryWeight(name: string | null | undefined): WeightCategory | null {
  if (!name) return null;
  return WEIGHT_MAP[name.toLowerCase().trim()] ?? null;
}

export function hasRavelry(): boolean {
  return Boolean(process.env.RAVELRY_USERNAME && process.env.RAVELRY_PASSWORD);
}

type RawFiber = { percentage?: number | null; fiber_type?: { name?: string } | null };
type RawYarn = {
  id: number;
  name: string;
  permalink: string;
  yarn_company_name?: string | null;
  yarn_company?: { name?: string | null } | null;
  yarn_weight?: { name?: string | null } | null;
  yardage?: number | null;
  grams?: number | null;
  yarn_fibers?: RawFiber[] | null;
  discontinued?: boolean | null;
};

function fiberString(fibers: RawFiber[] | null | undefined): string | null {
  if (!fibers?.length) return null;
  const parts = fibers
    .filter((f) => f.fiber_type?.name)
    .map((f) =>
      f.percentage != null ? `${f.percentage}% ${f.fiber_type!.name}` : f.fiber_type!.name!
    );
  return parts.length ? parts.join(", ") : null;
}

function toYarn(r: RawYarn): RavelryYarn {
  const weightName = r.yarn_weight?.name ?? null;
  return {
    id: r.id,
    name: r.name.trim(),
    company: (r.yarn_company?.name ?? r.yarn_company_name ?? "").trim(),
    permalink: r.permalink,
    url: `https://www.ravelry.com/yarns/library/${r.permalink}`,
    weight: mapRavelryWeight(weightName),
    weightName,
    yardage: r.yardage ?? null,
    grams: r.grams ?? null,
    fiber: fiberString(r.yarn_fibers),
    discontinued: Boolean(r.discontinued),
  };
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const auth = Buffer.from(
    `${process.env.RAVELRY_USERNAME}:${process.env.RAVELRY_PASSWORD}`
  ).toString("base64");
  const qs = new URLSearchParams(params).toString();
  // Ravelry uses "+" to join multiple ids; URLSearchParams would encode it.
  const url = `${BASE}${path}?${qs.replace(/%2B/g, "+")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Ravelry ${path} → ${res.status}`);
  return (await res.json()) as T;
}

// Process-lifetime cache; a real yarn_catalog table replaces this after the
// Railway migration.
const searchCache = new Map<string, RavelryYarn[]>();

export async function searchYarns(query: string, limit = 6): Promise<RavelryYarn[]> {
  const key = `${query.toLowerCase().trim()}|${limit}`;
  const hit = searchCache.get(key);
  if (hit) return hit;

  const search = await get<{ yarns: RawYarn[] }>("/yarns/search.json", {
    query,
    page_size: String(limit),
    sort: "best",
  });
  const ids = (search.yarns ?? []).map((y) => y.id);
  if (!ids.length) {
    searchCache.set(key, []);
    return [];
  }

  // Search results are shallow (no fibers / company object); fetch details.
  const details = await get<{ yarns: Record<string, RawYarn> | RawYarn[] }>(
    "/yarns.json",
    { ids: ids.join("+") }
  );
  const list = Array.isArray(details.yarns)
    ? details.yarns
    : Object.values(details.yarns ?? {});
  // Preserve search ranking.
  const byId = new Map(list.map((y) => [y.id, y]));
  const out = ids.map((id) => byId.get(id)).filter(Boolean).map((y) => toYarn(y!));
  searchCache.set(key, out);
  return out;
}
