// Shared label types + pure helpers. Safe to import from client components.

import type { WeightCategory } from "@/lib/mock";

export type YarnLabel = {
  brand: string | null;
  product_line: string | null;
  fiber: string | null;
  weight_category: string | null;
  yardage: number | null;
  meters: number | null;
  skein_weight_grams: number | null;
  colorway: string | null;
  dye_lot: string | null;
  needle_size: string | null;
  swatch_hex: string | null;
};

export type RavelryYarn = {
  id: number;
  name: string; // product line, e.g. "Rios"
  company: string; // e.g. "Malabrigo Yarn"
  permalink: string;
  url: string;
  weight: WeightCategory | null;
  weightName: string | null; // Ravelry's own label, e.g. "Super Bulky"
  yardage: number | null;
  grams: number | null;
  fiber: string | null; // "100% Superwash Merino" style
  discontinued: boolean;
};

export type RavelryMatch = {
  yarn: RavelryYarn | null;
  matchedBy: "auto" | "ai" | "none";
  candidates: RavelryYarn[];
  // Which label fields were replaced with Ravelry values.
  overrides: (keyof YarnLabel)[];
};

// Apply canonical values from a Ravelry yarn onto the label. Colorway, dye
// lot, swatch and needle size always stay from the band.
export function applyRavelry(
  label: YarnLabel,
  y: RavelryYarn
): { label: YarnLabel; overrides: (keyof YarnLabel)[] } {
  const out: YarnLabel = { ...label };
  const overrides: (keyof YarnLabel)[] = [];
  const set = <K extends keyof YarnLabel>(k: K, v: YarnLabel[K]) => {
    if (v == null || v === "") return;
    if (out[k] !== v) overrides.push(k);
    out[k] = v;
  };

  set("brand", y.company);
  set("product_line", y.name);
  set("weight_category", y.weight);
  set("fiber", y.fiber);
  set("yardage", y.yardage);
  if (y.yardage != null) set("meters", Math.round(y.yardage * 0.9144));
  set("skein_weight_grams", y.grams);
  return { label: out, overrides };
}
