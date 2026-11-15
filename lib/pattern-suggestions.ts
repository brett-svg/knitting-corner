// Server side of "What can I make?" → From Ravelry. Live Ravelry when a key
// is configured; the saved fixtures in demo mode (no DATABASE_URL).

import { hasDb } from "@/lib/db";
import type { Pattern, WeightCategory, Yarn } from "@/lib/mock";
import {
  getYarnSearchName,
  hasRavelry,
  searchPatterns,
  type PatternFilters,
  type RavelryPattern,
} from "@/lib/ravelry";
import { fixtureSearch, fixtureYarnName } from "@/lib/ravelry-fixtures";
import { buildSuggestions, type Suggestion } from "@/lib/suggestions";

export type Craft = "knitting" | "crochet";

export type SuggestionOptions = {
  free?: boolean;
  craft?: Craft | null; // null = any craft
  category?: string | null;
};

export type SuggestionsResponse = {
  enabled: boolean;
  demo: boolean;
  weight: WeightCategory | null;
  yardsOnHand: number;
  linkedYarns: number; // how many of the yarns are matched to Ravelry (exact-yarn search)
  suggestions: Suggestion[];
};

// Demo mode always has (fixture) data; otherwise a Ravelry key is needed.
export function ravelrySuggestionsEnabled(): boolean {
  return !hasDb() || hasRavelry();
}

export function parseCraft(v: string | null): Craft | null {
  if (v === "any") return null;
  return v === "crochet" ? "crochet" : "knitting"; // a knitting app: default to knitting
}

// Caps the number of per-yarn searches when many yarns are combined.
const MAX_YARN_SEARCHES = 4;

export async function suggestForYarns(
  yarns: Yarn[],
  library: Pattern[],
  opts: SuggestionOptions = {}
): Promise<SuggestionsResponse> {
  const demo = !hasDb();
  const weight = yarns[0]?.weight ?? null;
  const yardsOnHand = yarns.reduce((n, y) => n + (y.yardage || 0) * (y.skeins || 0), 0);
  const ravelryYarnIds = Array.from(
    new Set(yarns.map((y) => y.ravelryYarnId).filter((id): id is number => typeof id === "number"))
  ).slice(0, MAX_YARN_SEARCHES);
  const base = { enabled: true, demo, weight, yardsOnHand, linkedYarns: ravelryYarnIds.length };
  if (!weight || yardsOnHand <= 0) return { ...base, suggestions: [] };

  const common: PatternFilters = {
    maxYards: yardsOnHand,
    craft: opts.craft ?? undefined,
    free: opts.free || undefined,
    category: opts.category || undefined,
  };
  const search = (f: PatternFilters) => (demo ? Promise.resolve(fixtureSearch(f)) : searchPatterns(f));
  const yarnName = (id: number) => (demo ? Promise.resolve(fixtureYarnName(id)) : getYarnSearchName(id));

  const byYarnTask = Promise.all(
    ravelryYarnIds.map(async (id) => {
      const name = await yarnName(id);
      return name ? search({ ...common, yarnName: name, pageSize: 24 }) : [];
    })
  ).then((lists) => lists.flat());
  const byWeightTask = search({ ...common, weight, pageSize: 40 });

  // One failing half shouldn't blank the other; only fail if both do.
  const [byYarn, byWeight] = await Promise.allSettled([byYarnTask, byWeightTask]);
  if (byYarn.status === "rejected" && byWeight.status === "rejected") throw byWeight.reason;
  for (const r of [byYarn, byWeight]) {
    if (r.status === "rejected") console.warn("[suggestions] partial Ravelry failure:", r.reason);
  }
  const ok = (r: PromiseSettledResult<RavelryPattern[]>) => (r.status === "fulfilled" ? r.value : []);

  return {
    ...base,
    suggestions: buildSuggestions({
      weight,
      yardsOnHand,
      ravelryYarnIds,
      byYarn: ok(byYarn),
      byWeight: ok(byWeight),
      library,
      freeOnly: opts.free,
    }),
  };
}
