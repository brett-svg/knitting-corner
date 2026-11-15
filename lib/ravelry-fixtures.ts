// Offline stand-in for searchPatterns(), backed by the saved Ravelry
// responses in lib/__fixtures__ (refresh with scripts/fetch-ravelry-fixtures.mjs).
// Demo mode uses it so the suggestion UI can be kicked around and
// screenshotted without a key; tests use it as real-shaped data.

import fixture from "@/lib/__fixtures__/ravelry-patterns.json";
import { toPattern, type PatternFilters, type RavelryPattern, type RawPattern } from "@/lib/ravelry";

const raw = Object.values((fixture as unknown as { patterns: Record<string, RawPattern> }).patterns);
const all = raw.map((r) => ({ pattern: toPattern(r), raw: r }));

export function fixturePatterns(): RavelryPattern[] {
  return all.map((x) => x.pattern);
}

// Mirrors the live filters closely enough for a demo: yarn text must match
// every word of a listed yarn's "Company Name"; weight/yardage/free/craft/
// category behave like Ravelry's.
export function fixtureSearch(f: PatternFilters): RavelryPattern[] {
  const words = f.yarnName?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  return all
    .filter(({ pattern: p, raw: r }) => {
      if (f.weight && p.weight !== f.weight) return false;
      if (f.maxYards != null && (p.yardage ?? 0) > f.maxYards) return false;
      if (f.free && !p.free) return false;
      if (f.craft && p.craft?.toLowerCase() !== f.craft) return false;
      if (f.category && !p.categories.includes(f.category)) return false;
      if (words.length) {
        const hit = (r.packs ?? []).some((pk) => {
          const hay = `${pk.yarn?.yarn_company_name ?? ""} ${pk.yarn?.name ?? ""}`.toLowerCase();
          return words.every((w) => hay.includes(w));
        });
        if (!hit) return false;
      }
      return true;
    })
    .map((x) => x.pattern)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, f.pageSize ?? 40);
}

// Ravelry names for the yarns the demo stash links to.
const DEMO_YARN_NAMES: Record<number, string> = {
  62569: "Malabrigo Yarn Rios",
  68219: "Brooklyn Tweed Shelter",
};
export function fixtureYarnName(id: number): string | null {
  return DEMO_YARN_NAMES[id] ?? null;
}
