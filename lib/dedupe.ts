// "Is this the same yarn I already have?" — tolerant of AI extraction wobble.

export type DedupeKey = {
  brand: string | null;
  colorway: string | null;
  dye_lot: string | null;
};

// Normalize a brand/colorway/dye-lot string for fuzzy comparison:
// lowercase, strip punctuation, collapse whitespace, drop common
// suffix noise like "yarns", "yarn co", "yarn company", "ltd".
export function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[®™©.,'"`!?]/g, "")
    .replace(/\s+(yarn(s)?( co(mpany)?)?|ltd|inc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sameYarn(a: DedupeKey, b: DedupeKey): boolean {
  const aBrand = normalize(a.brand);
  const bBrand = normalize(b.brand);
  // Brand: exact-after-normalization OR one is a substring of the other
  // (handles "Lion Brand" vs "Lion Brand Yarn Company" extraction wobble).
  const brandMatches =
    !!aBrand &&
    !!bBrand &&
    (aBrand === bBrand || aBrand.includes(bBrand) || bBrand.includes(aBrand));
  if (!brandMatches) return false;

  const aColor = normalize(a.colorway);
  const bColor = normalize(b.colorway);
  if (!aColor || !bColor || aColor !== bColor) return false;

  // Dye lot is the strongest tiebreaker. If both have lots, they must match.
  // If neither has one, treat as match. If only one has one, treat as match
  // too (the AI may have skipped it on one scan).
  const aLot = normalize(a.dye_lot);
  const bLot = normalize(b.dye_lot);
  if (aLot && bLot && aLot !== bLot) return false;
  return true;
}
