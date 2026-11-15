import { describe, expect, it } from "vitest";
import type { Pattern } from "@/lib/mock";
import type { RavelryPattern } from "@/lib/ravelry";
import { fixturePatterns, fixtureSearch } from "@/lib/ravelry-fixtures";
import {
  buildSuggestions,
  fitsYardage,
  libraryMatches,
  normalizeUrl,
} from "@/lib/suggestions";

const RIOS = 62569;
const pool = fixturePatterns();

function pat(over: Partial<RavelryPattern> & { id: number }): RavelryPattern {
  return {
    name: `P${over.id}`,
    permalink: `p${over.id}`,
    url: `https://www.ravelry.com/patterns/library/p${over.id}`,
    sourceUrl: null,
    designer: null,
    photo: null,
    yardage: 300,
    yardageMax: null,
    weight: "Worsted",
    weightName: "Worsted",
    gauge: null,
    needles: [],
    free: false,
    price: 6,
    currency: "USD",
    currencySymbol: "$",
    craft: "Knitting",
    categories: [],
    yarnIds: [],
    popularity: 0,
    ...over,
  };
}
const base = { weight: "Worsted" as const, yardsOnHand: 840, ravelryYarnIds: [RIOS], library: [] };

describe("buildSuggestions", () => {
  it("puts exact-yarn patterns first, then same-weight ones", () => {
    const out = buildSuggestions({
      ...base,
      byYarn: [pat({ id: 1, yarnIds: [RIOS], popularity: 1 })],
      byWeight: [pat({ id: 2, popularity: 999 })],
    });
    expect(out.map((p) => [p.id, p.match])).toEqual([[1, "yarn"], [2, "weight"]]);
  });

  it("drops fuzzy yarn-search hits that don't list the exact yarn", () => {
    const out = buildSuggestions({
      ...base,
      byYarn: [pat({ id: 1, yarnIds: [216428] })], // Rios Chunky, not Rios
      byWeight: [],
    });
    expect(out).toEqual([]);
  });

  it("only keeps patterns whose smallest size fits the yarn on hand", () => {
    const out = buildSuggestions({
      ...base,
      byYarn: [pat({ id: 1, yarnIds: [RIOS], yardage: 900 })],
      byWeight: [
        pat({ id: 2, yardage: 840, yardageMax: 2000 }),
        pat({ id: 3, yardage: 841 }),
        pat({ id: 4, yardage: null }),
      ],
    });
    expect(out.map((p) => p.id)).toEqual([2]);
  });

  it("keeps only the right weight from the weight search", () => {
    const out = buildSuggestions({
      ...base,
      byYarn: [],
      byWeight: [pat({ id: 1, weight: "DK" }), pat({ id: 2, weight: null }), pat({ id: 3 })],
    });
    expect(out.map((p) => p.id)).toEqual([3]);
  });

  it("removes duplicates, keeping the exact-yarn version", () => {
    const p = pat({ id: 7, yarnIds: [RIOS] });
    const out = buildSuggestions({ ...base, byYarn: [p], byWeight: [p] });
    expect(out).toHaveLength(1);
    expect(out[0].match).toBe("yarn");
  });

  it("hides patterns already in the library, by Ravelry or designer URL", () => {
    const library = [
      { externalUrl: "http://ravelry.com/patterns/library/p1/" },
      { externalUrl: "https://WWW.designer.com/shop/hat?ref=x" },
    ] as Pattern[];
    const out = buildSuggestions({
      ...base,
      library,
      byYarn: [],
      byWeight: [
        pat({ id: 1 }),
        pat({ id: 2, sourceUrl: "https://designer.com/shop/hat" }),
        pat({ id: 3 }),
      ],
    });
    expect(out.map((p) => p.id)).toEqual([3]);
  });

  it("filters to free patterns when asked", () => {
    const out = buildSuggestions({
      ...base,
      freeOnly: true,
      byYarn: [],
      byWeight: [pat({ id: 1, free: true, price: null }), pat({ id: 2 })],
    });
    expect(out.map((p) => p.id)).toEqual([1]);
  });

  it("returns at most 12 by default, most popular first", () => {
    const many = Array.from({ length: 30 }, (_, i) => pat({ id: i + 1, popularity: i }));
    const out = buildSuggestions({ ...base, byYarn: [], byWeight: many });
    expect(out).toHaveLength(12);
    expect(out[0].id).toBe(30);
  });

  it("works end to end on the saved Ravelry data", () => {
    const filters = { maxYards: 840, craft: "knitting" as const };
    const out = buildSuggestions({
      ...base,
      byYarn: fixtureSearch({ ...filters, yarnName: "Malabrigo Yarn Rios", pageSize: 24 }),
      byWeight: fixtureSearch({ ...filters, weight: "Worsted" }),
    });
    expect(out.length).toBe(12);
    expect(out[0].match).toBe("yarn");
    expect(new Set(out.map((p) => p.id)).size).toBe(out.length);
    for (const p of out) {
      expect(p.yardage).toBeLessThanOrEqual(840);
      if (p.match === "yarn") expect(p.yarnIds).toContain(RIOS);
      else expect(p.weight).toBe("Worsted");
    }
  });
});

describe("fixture data", () => {
  it("has patterns for every app weight, for demo mode", () => {
    for (const w of ["Lace", "Fingering", "Sport", "DK", "Worsted", "Aran", "Bulky"] as const) {
      expect(pool.filter((p) => p.weight === w).length).toBeGreaterThan(5);
    }
  });
});

describe("helpers", () => {
  it("normalizeUrl ignores protocol, www, case, query and trailing slash", () => {
    expect(normalizeUrl("https://www.Ravelry.com/patterns/library/x/?a=1#b")).toBe(
      "ravelry.com/patterns/library/x"
    );
    expect(normalizeUrl("  ")).toBeNull();
    expect(normalizeUrl(null)).toBeNull();
  });

  it("fitsYardage needs a known yardage", () => {
    expect(fitsYardage(pat({ id: 1, yardage: 100 }), 100)).toBe(true);
    expect(fitsYardage(pat({ id: 1, yardage: 101 }), 100)).toBe(false);
    expect(fitsYardage(pat({ id: 1, yardage: null }), 100)).toBe(false);
  });

  it("libraryMatches keeps the yarn page's original rule", () => {
    const lib = [
      { id: "a", yarnWeight: "Worsted", requiredYardage: 900 },
      { id: "b", yarnWeight: "Worsted", requiredYardage: 500 },
      { id: "c", yarnWeight: null, requiredYardage: null },
      { id: "d", yarnWeight: "DK", requiredYardage: 100 },
    ] as Pattern[];
    expect(libraryMatches(lib, "Worsted", 840).map((p) => p.id)).toEqual(["b", "c"]);
  });
});
