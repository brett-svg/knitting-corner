import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { fileUrl, hasStorage, objectKey, putObject } from "@/lib/storage";
import { gradientFromHex, pickSwatch } from "@/lib/swatch";

export const runtime = "nodejs";
export const maxDuration = 30;

// Normalize a brand/colorway/dye-lot string for fuzzy comparison:
// lowercase, strip punctuation, collapse whitespace, drop common
// suffix noise like "yarns", "yarn co", "yarn company", "ltd".
function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[®™©.,'"`!?]/g, "")
    .replace(/\s+(yarn(s)?( co(mpany)?)?|ltd|inc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sameYarn(
  a: { brand: string | null; colorway: string | null; dye_lot: string | null },
  b: { brand: string | null; colorway: string | null; dye_lot: string | null }
): boolean {
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

function decodeDataUrl(dataUrl: string) {
  const m = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return {
    contentType: m[1],
    bytes: Buffer.from(m[2], "base64"),
    ext: m[1].split("/")[1].replace("jpeg", "jpg").split("+")[0],
  };
}

export async function POST(req: Request) {
  const body = await req.json();
  const label = body.label ?? {};
  const skeins = Number(body.skeins ?? 1);
  const images: string[] = Array.isArray(body.images) ? body.images : [];

  const { user, fail } = await requireUser();
  if (fail) return fail;

  // Duplicate detection: same yarn for this user, normalized comparison.
  const force = Boolean(body.force);
  if (!force && label.brand && label.colorway) {
    const existing = await db()
      .select({
        id: schema.yarns.id,
        brand: schema.yarns.brand,
        productLine: schema.yarns.productLine,
        colorway: schema.yarns.colorway,
        dyeLot: schema.yarns.dyeLot,
        skeins: schema.yarns.skeins,
        swatch: schema.yarns.swatch,
        imageKey: schema.yarns.imageKey,
      })
      .from(schema.yarns)
      .where(eq(schema.yarns.userId, user.id));
    const dupe = existing.find((e) =>
      sameYarn(
        { brand: e.brand, colorway: e.colorway, dye_lot: e.dyeLot },
        {
          brand: label.brand,
          colorway: label.colorway,
          dye_lot: label.dye_lot,
        }
      )
    );
    if (dupe) {
      return NextResponse.json(
        {
          duplicate: {
            id: dupe.id,
            brand: dupe.brand,
            productLine: dupe.productLine,
            colorway: dupe.colorway,
            dyeLot: dupe.dyeLot,
            skeins: dupe.skeins,
            swatch: dupe.swatch,
            imageUrl: fileUrl(dupe.imageKey),
          },
          incomingSkeins: skeins,
        },
        { status: 409 }
      );
    }
  }

  // Upload the first image (if any). Skipped silently when no bucket is wired.
  let imageKey: string | null = null;
  const first = images[0];
  if (hasStorage() && first?.startsWith("data:image/")) {
    const decoded = decodeDataUrl(first);
    if (decoded) {
      imageKey = objectKey("yarn-photos", user.id, decoded.ext);
      try {
        await putObject(imageKey, decoded.bytes, decoded.contentType);
      } catch (err) {
        return NextResponse.json(
          { error: `Upload failed: ${err instanceof Error ? err.message : "unknown"}` },
          { status: 500 }
        );
      }
    }
  }

  const swatch =
    gradientFromHex(label.swatch_hex ?? "") || pickSwatch(label.colorway);

  try {
    const [row] = await db()
      .insert(schema.yarns)
      .values({
        userId: user.id,
        brand: label.brand,
        productLine: label.product_line,
        fiber: label.fiber,
        weightCategory: label.weight_category,
        yardage: label.yardage,
        meters: label.meters,
        skeinWeightGrams: label.skein_weight_grams,
        colorway: label.colorway,
        dyeLot: label.dye_lot,
        needleSize: label.needle_size,
        skeins,
        swatch,
        imageKey,
        storageLocationId: body.locationId || null,
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        ravelryYarnId: Number.isInteger(body.ravelryYarnId) ? body.ravelryYarnId : null,
      })
      .returning({ id: schema.yarns.id });
    return NextResponse.json({ ok: true, persisted: true, id: row.id, imageUrl: fileUrl(imageKey) });
  } catch (err) {
    return serverError(err);
  }
}
