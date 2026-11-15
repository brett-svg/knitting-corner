import { describe, expect, it } from "vitest";
import search from "@/lib/__fixtures__/ravelry-pattern-search.json";
import details from "@/lib/__fixtures__/ravelry-patterns.json";
import {
  RAVELRY_WEIGHTS,
  mapRavelryWeight,
  patternSearchParams,
  toPattern,
  type RawPattern,
} from "@/lib/ravelry";

describe("weight mapping", () => {
  it("expands app weights to every matching Ravelry weight", () => {
    expect([...RAVELRY_WEIGHTS.Fingering].sort()).toEqual(["fingering", "light-fingering"]);
    expect([...RAVELRY_WEIGHTS.Bulky].sort()).toEqual(["bulky", "jumbo", "super-bulky"]);
    expect([...RAVELRY_WEIGHTS.Lace].sort()).toEqual(["cobweb", "lace", "thread"]);
    expect(RAVELRY_WEIGHTS.DK).toEqual(["dk"]);
    expect(RAVELRY_WEIGHTS.Worsted).toEqual(["worsted"]);
  });

  it("covers every app weight", () => {
    expect(Object.keys(RAVELRY_WEIGHTS).sort()).toEqual(
      ["Aran", "Bulky", "DK", "Fingering", "Lace", "Sport", "Worsted"]
    );
  });

  it("round-trips: each Ravelry permalink maps back to its app weight", () => {
    for (const [cat, permalinks] of Object.entries(RAVELRY_WEIGHTS)) {
      for (const p of permalinks) expect(mapRavelryWeight(p.replace(/-/g, " "))).toBe(cat);
    }
  });

  it("maps Ravelry display names, ignoring case", () => {
    expect(mapRavelryWeight("Light Fingering")).toBe("Fingering");
    expect(mapRavelryWeight("Super Bulky")).toBe("Bulky");
    expect(mapRavelryWeight("Any gauge")).toBeNull();
    expect(mapRavelryWeight(null)).toBeNull();
  });
});

describe("patternSearchParams", () => {
  it("uses the filter formats confirmed against the live API", () => {
    expect(
      patternSearchParams({
        weight: "Fingering",
        maxYards: 874.6,
        yarnName: "Malabrigo Yarn Rios",
        craft: "knitting",
        free: true,
        category: "hat",
        pageSize: 24,
      })
    ).toEqual({
      sort: "popularity",
      page_size: "24",
      weight: "light-fingering|fingering",
      yardage: "|874",
      yarn: "Malabrigo Yarn Rios",
      craft: "knitting",
      availability: "free",
      pc: "hat",
    });
  });

  it("leaves out filters that aren't set", () => {
    expect(patternSearchParams({})).toEqual({ sort: "popularity", page_size: "40" });
  });
});

describe("toPattern", () => {
  const all = Object.values((details as unknown as { patterns: Record<string, RawPattern> }).patterns);

  it("reads a full pattern record", () => {
    const raw = all.find((p) => p.yardage && p.yardage_max && p.pattern_needle_sizes?.length && !p.free)!;
    const p = toPattern(raw);
    expect(p.url).toBe(`https://www.ravelry.com/patterns/library/${raw.permalink}`);
    expect(p.yardage).toBe(raw.yardage);
    expect(p.yardageMax).toBe(raw.yardage_max);
    expect(p.designer).toBe(raw.pattern_author!.name!.trim());
    expect(p.photo).toMatch(/^https:\/\//);
    expect(p.needles.length).toBeGreaterThan(0);
    expect(p.needles[0]).not.toMatch(/\s{2}/); // "US 8  - 5.0 mm" → "US 8 - 5.0 mm"
    expect(p.free).toBe(false);
    expect(p.price).toBe(raw.price);
  });

  it("collects yarn ids and category chains", () => {
    const raw = all.find((p) => p.packs?.some((pk) => pk.yarn_id === 62569))!;
    const p = toPattern(raw);
    expect(p.yarnIds).toContain(62569);
    expect(p.categories.length).toBeGreaterThan(0);
    expect(p.categories).not.toContain("categories");
  });

  it("treats Ravelry's 0 yardage as unknown", () => {
    const p = toPattern({ id: 1, name: " X ", permalink: "x", yardage: 0, yardage_max: 0 });
    expect(p.yardage).toBeNull();
    expect(p.yardageMax).toBeNull();
    expect(p.name).toBe("X");
  });

  it("reads a shallow search result (no details yet)", () => {
    const raw = (search as unknown as { response: { patterns: RawPattern[] } }).response.patterns[0];
    const p = toPattern(raw);
    expect(p.id).toBe(raw.id);
    expect(p.designer).toBeTruthy();
    expect(p.photo).toMatch(/^https:\/\//);
    expect(p.yardage).toBeNull();
  });
});
