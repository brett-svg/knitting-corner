import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { deleteObject, fileUrl, hasStorage, objectKey, putObject } from "@/lib/storage";
import { gradientFromHex, pickSwatch } from "@/lib/swatch";
import { sameYarn } from "@/lib/dedupe";
import { roundLabel } from "@/lib/yarn-label";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  const label = roundLabel(body.label ?? {});
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
    // Don't leave the photo orphaned in the bucket.
    if (imageKey) await deleteObject(imageKey);
    return serverError(err);
  }
}
