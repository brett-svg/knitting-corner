// Builds the "From Ravelry" list for "What can I make?". Pure, so it can be
// tested against saved Ravelry responses.

import type { Pattern, WeightCategory } from "@/lib/mock";
import type { RavelryPattern } from "@/lib/ravelry";

export type Suggestion = RavelryPattern & {
  // "yarn": the pattern lists this exact yarn; "weight": same weight, fits the yardage
  match: "yarn" | "weight";
};

// "From your library": saved patterns of this weight (or no weight given)
// that need no more yarn than is on hand, biggest projects first.
export function libraryMatches(patterns: Pattern[], weight: WeightCategory, yardsOnHand: number): Pattern[] {
  return patterns
    .filter((p) => {
      if (p.yarnWeight && p.yarnWeight !== weight) return false;
      if (p.requiredYardage && yardsOnHand < p.requiredYardage) return false;
      return true;
    })
    .sort((a, b) => (b.requiredYardage ?? 0) - (a.requiredYardage ?? 0));
}

// Item types for the /stash/make filter → Ravelry category permalinks.
export const PATTERN_TYPES = [
  { value: "hat", label: "Hats" },
  { value: "cowl", label: "Cowls" },
  { value: "scarf", label: "Scarves" },
  { value: "shawl-wrap", label: "Shawls" },
  { value: "sweater", label: "Sweaters" },
  { value: "socks", label: "Socks" },
  { value: "hands", label: "Mittens & gloves" },
  { value: "blanket", label: "Blankets" },
] as const;

export type SuggestionInput = {
  weight: WeightCategory;
  yardsOnHand: number;
  ravelryYarnIds: number[];
  byYarn: RavelryPattern[];
  byWeight: RavelryPattern[];
  library: Array<Pick<Pattern, "externalUrl">>;
  freeOnly?: boolean;
  limit?: number;
};

// Compare URLs loosely: ignore protocol, "www.", trailing slash, query, hash, case.
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
  return s || null;
}

// The pattern's smallest size fits in the yarn on hand. Patterns without a
// listed yardage are left out: we can't say whether they fit.
export function fitsYardage(p: RavelryPattern, yardsOnHand: number): boolean {
  return p.yardage != null && p.yardage > 0 && p.yardage <= yardsOnHand;
}

export function buildSuggestions(input: SuggestionInput): Suggestion[] {
  const { weight, yardsOnHand, freeOnly, limit = 12 } = input;
  const exact = new Set(input.ravelryYarnIds);
  const saved = new Set(
    input.library.map((p) => normalizeUrl(p.externalUrl)).filter((u): u is string => Boolean(u))
  );
  const inLibrary = (p: RavelryPattern) =>
    [p.url, p.sourceUrl].some((u) => {
      const n = normalizeUrl(u);
      return n != null && saved.has(n);
    });
  const byPopularity = (a: RavelryPattern, b: RavelryPattern) => b.popularity - a.popularity;

  const candidates: Suggestion[] = [
    ...input.byYarn
      .filter((p) => p.yarnIds.some((id) => exact.has(id)))
      .sort(byPopularity)
      .map((p) => ({ ...p, match: "yarn" as const })),
    ...input.byWeight
      .filter((p) => p.weight === weight)
      .sort(byPopularity)
      .map((p) => ({ ...p, match: "weight" as const })),
  ];

  const seen = new Set<number>();
  const out: Suggestion[] = [];
  for (const p of candidates) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    if (!fitsYardage(p, yardsOnHand)) continue;
    if (freeOnly && !p.free) continue;
    if (inLibrary(p)) continue;
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}
