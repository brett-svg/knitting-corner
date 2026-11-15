// Thin client for the Ravelry yarn and pattern databases.
// Auth: a "basic auth, read-only" app from https://www.ravelry.com/pro/developer
// gives you an access key + secret; those go in RAVELRY_USERNAME / RAVELRY_PASSWORD.

import type { WeightCategory } from "@/lib/mock";
import type { RavelryYarn } from "@/lib/yarn-label";
import { cached } from "@/lib/ravelry-cache";

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

// The reverse: app weight → Ravelry weight permalinks for search filters.
// Fingering → light-fingering|fingering, Bulky → bulky|super-bulky|jumbo, …
export const RAVELRY_WEIGHTS = Object.entries(WEIGHT_MAP).reduce(
  (acc, [name, cat]) => {
    (acc[cat] ??= []).push(name.replace(/ /g, "-"));
    return acc;
  },
  {} as Record<WeightCategory, string[]>
);

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

export async function searchYarns(query: string, limit = 6): Promise<RavelryYarn[]> {
  const key = `yarns:${query.toLowerCase().trim()}|${limit}`;
  return cached(key, () => fetchYarns(query, limit));
}

async function fetchYarns(query: string, limit: number): Promise<RavelryYarn[]> {
  const search = await get<{ yarns: RawYarn[] }>("/yarns/search.json", {
    query,
    page_size: String(limit),
    sort: "best",
  });
  const ids = (search.yarns ?? []).map((y) => y.id);
  if (!ids.length) return [];

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
  return ids.map((id) => byId.get(id)).filter(Boolean).map((y) => toYarn(y!));
}

// "Company Name" for a Ravelry yarn id, e.g. "Malabrigo Yarn Rios". Used as
// the text for pattern search's `yarn` filter. Null when the id is unknown.
export async function getYarnSearchName(id: number): Promise<string | null> {
  return cached(`yarn-name:${id}`, async () => {
    try {
      const res = await get<{ yarn: RawYarn }>(`/yarns/${id}.json`, {});
      const y = res.yarn;
      return [y.yarn_company?.name ?? y.yarn_company_name, y.name]
        .filter(Boolean)
        .join(" ")
        .trim() || null;
    } catch (err) {
      if (err instanceof Error && err.message.endsWith("404")) return null;
      throw err;
    }
  });
}

// ── Patterns ──────────────────────────────────────────────────────────────

export type RavelryPattern = {
  id: number;
  name: string;
  permalink: string;
  url: string; // the Ravelry pattern page (always link here, for attribution)
  sourceUrl: string | null; // designer's own page, when listed
  designer: string | null;
  photo: string | null;
  yardage: number | null; // smallest size
  yardageMax: number | null; // largest size
  weight: WeightCategory | null;
  weightName: string | null; // Ravelry's own name, e.g. "Light Fingering"
  gauge: string | null;
  needles: string[]; // e.g. ["US 8  - 5.0 mm"]
  free: boolean;
  price: number | null;
  currency: string | null;
  currencySymbol: string | null;
  craft: string | null;
  categories: string[]; // category permalinks including parents, e.g. ["hat", "accessories"]
  yarnIds: number[]; // Ravelry yarn ids the pattern lists
  popularity: number; // projects_count
};

type RawCategory = { permalink?: string | null; parent?: RawCategory | null };
export type RawPattern = {
  id: number;
  name: string;
  permalink: string;
  url?: string | null;
  free?: boolean | null;
  price?: number | null;
  currency?: string | null;
  currency_symbol?: string | null;
  yardage?: number | null;
  yardage_max?: number | null;
  gauge_description?: string | null;
  projects_count?: number | null;
  yarn_weight?: { name?: string | null } | null;
  craft?: { name?: string | null } | null;
  pattern_author?: { name?: string | null } | null;
  designer?: { name?: string | null } | null;
  photos?: Array<{ medium_url?: string | null; small_url?: string | null }> | null;
  first_photo?: { medium_url?: string | null; small_url?: string | null } | null;
  pattern_needle_sizes?: Array<{ name?: string | null }> | null;
  pattern_categories?: RawCategory[] | null;
  packs?: Array<{
    yarn_id?: number | null;
    yarn?: { id?: number | null; name?: string | null; yarn_company_name?: string | null } | null;
  }> | null;
};

const ravelryPatternUrl = (permalink: string) =>
  `https://www.ravelry.com/patterns/library/${permalink}`;

function categoryChain(c: RawCategory | null | undefined): string[] {
  const out: string[] = [];
  for (let cur = c; cur; cur = cur.parent) {
    if (cur.permalink && cur.permalink !== "categories") out.push(cur.permalink);
  }
  return out;
}

export function toPattern(r: RawPattern): RavelryPattern {
  const photo = r.photos?.[0] ?? r.first_photo ?? null;
  const weightName = r.yarn_weight?.name ?? null;
  const yarnIds = (r.packs ?? [])
    .map((p) => p.yarn_id ?? p.yarn?.id ?? null)
    .filter((id): id is number => typeof id === "number");
  return {
    id: r.id,
    name: r.name.trim(),
    permalink: r.permalink,
    url: ravelryPatternUrl(r.permalink),
    sourceUrl: r.url?.trim() || null,
    designer: (r.pattern_author?.name ?? r.designer?.name ?? "").trim() || null,
    photo: photo?.medium_url ?? photo?.small_url ?? null,
    // Ravelry uses 0 for "not specified".
    yardage: r.yardage || null,
    yardageMax: r.yardage_max || null,
    weight: mapRavelryWeight(weightName),
    weightName,
    gauge: r.gauge_description?.replace(/\s+/g, " ").trim() || null,
    needles: (r.pattern_needle_sizes ?? [])
      .map((n) => n.name?.replace(/\s+/g, " ").trim())
      .filter((n): n is string => Boolean(n)),
    free: Boolean(r.free),
    price: r.free ? null : r.price ?? null,
    currency: r.currency ?? null,
    currencySymbol: r.currency_symbol ?? null,
    craft: r.craft?.name ?? null,
    categories: Array.from(new Set((r.pattern_categories ?? []).flatMap(categoryChain))),
    yarnIds: Array.from(new Set(yarnIds)),
    popularity: r.projects_count ?? 0,
  };
}

export type PatternFilters = {
  weight?: WeightCategory;
  maxYards?: number; // the pattern's smallest size must need no more than this
  yarnName?: string; // free text matched against yarn names (Ravelry's `yarn` filter)
  craft?: "knitting" | "crochet";
  free?: boolean;
  category?: string; // Ravelry category permalink, e.g. "hat", "shawl-wrap"
  pageSize?: number;
};

// Ravelry's pattern search takes the same filters as the on-site search.
// Confirmed against the live API (Nov 2026):
//   weight=dk|worsted     pipe-separated weight permalinks
//   yardage=|840          min|max; matches patterns whose range overlaps it,
//                         i.e. smallest size ≤ 840
//   yarn=Malabrigo Rios   fuzzy text match on yarn names, NOT an id/permalink
//                         filter — callers confirm exact yarns via `yarnIds`
//   craft=knitting, availability=free, pc=<category>, sort=popularity
export function patternSearchParams(f: PatternFilters): Record<string, string> {
  const p: Record<string, string> = {
    sort: "popularity",
    page_size: String(f.pageSize ?? 40),
  };
  if (f.weight) p.weight = RAVELRY_WEIGHTS[f.weight].join("|");
  if (f.maxYards != null) p.yardage = `|${Math.max(0, Math.floor(f.maxYards))}`;
  if (f.yarnName) p.yarn = f.yarnName;
  if (f.craft) p.craft = f.craft;
  if (f.free) p.availability = "free";
  if (f.category) p.pc = f.category;
  return p;
}

// Search results are shallow (no yardage, gauge or yarns), so this searches
// and then fetches details — the same two steps as searchYarns().
export async function searchPatterns(filters: PatternFilters): Promise<RavelryPattern[]> {
  const params = patternSearchParams(filters);
  const key = `patterns:${new URLSearchParams(Object.entries(params).sort()).toString()}`;
  return cached(key, async () => {
    const search = await get<{ patterns: Array<{ id: number }> }>(
      "/patterns/search.json",
      params
    );
    return getPatternDetails((search.patterns ?? []).map((p) => p.id));
  });
}

// Full details for many patterns, in the order given.
export async function getPatternDetails(ids: number[]): Promise<RavelryPattern[]> {
  const byId = new Map<number, RawPattern>();
  for (let i = 0; i < ids.length; i += 50) {
    const res = await get<{ patterns: Record<string, RawPattern> | RawPattern[] }>(
      "/patterns.json",
      { ids: ids.slice(i, i + 50).join("+") }
    );
    const list = Array.isArray(res.patterns) ? res.patterns : Object.values(res.patterns ?? {});
    for (const p of list) byId.set(p.id, p);
  }
  return ids.map((id) => byId.get(id)).filter(Boolean).map((p) => toPattern(p!));
}
