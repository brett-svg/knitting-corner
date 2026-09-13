import { NextResponse, after } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notFound, requireUser, serverError } from "@/lib/api";
import { runExtraction, storeImages, touchSession } from "@/lib/sessions";
import { roundLabel, type YarnLabel } from "@/lib/yarn-label";

export const runtime = "nodejs";
export const maxDuration = 60;

const { scanItems } = schema;

const LABEL_KEYS: (keyof YarnLabel)[] = [
  "brand",
  "product_line",
  "fiber",
  "weight_category",
  "yardage",
  "meters",
  "skein_weight_grams",
  "colorway",
  "dye_lot",
  "needle_size",
  "swatch_hex",
];

type Params = { params: Promise<{ id: string; itemId: string }> };

async function owned(userId: string, sessionId: string, itemId: string) {
  return db().query.scanItems.findFirst({
    where: and(
      eq(scanItems.id, itemId),
      eq(scanItems.sessionId, sessionId),
      eq(scanItems.userId, userId)
    ),
  });
}

// Edits from the review table, "+1" from the phone, "+ back photo", retry.
export async function PATCH(req: Request, { params }: Params) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id, itemId } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const item = await owned(user.id, id, itemId);
    if (!item) return notFound();
    if (item.status === "committed")
      return NextResponse.json({ error: "Already committed" }, { status: 409 });

    const update: Partial<typeof scanItems.$inferInsert> = { updatedAt: new Date() };
    let reextract = false;

    if (body.label && typeof body.label === "object") {
      const merged: YarnLabel = { ...(item.label ?? emptyLabel()) };
      for (const k of LABEL_KEYS) {
        if (k in body.label) (merged as Record<string, unknown>)[k] = body.label[k] ?? null;
      }
      update.label = roundLabel(merged);
    }
    if (typeof body.skeins === "number") update.skeins = Math.max(1, Math.round(body.skeins));
    if (typeof body.incrementSkeins === "number")
      update.skeins = sql`greatest(1, ${scanItems.skeins} + ${Math.round(body.incrementSkeins)})` as never;
    if ("locationId" in body) update.locationId = body.locationId || null;
    if ("notes" in body) update.notes = body.notes ? String(body.notes) : null;
    if (typeof body.mergeIntoMatch === "boolean") update.mergeIntoMatch = body.mergeIntoMatch;
    if ("matchedYarnId" in body) update.matchedYarnId = body.matchedYarnId || null;
    if (["extracted", "accepted", "discarded"].includes(body.status)) update.status = body.status;

    if (Array.isArray(body.addImages) && body.addImages.length) {
      const keys = await storeImages(user.id, body.addImages);
      update.imageKeys = [...item.imageKeys, ...keys].slice(0, 4);
      reextract = true;
    }
    if (body.retry === true) reextract = true;

    await db().update(scanItems).set(update).where(eq(scanItems.id, itemId));
    await touchSession(id);
    if (reextract) after(() => runExtraction(itemId, user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id, itemId } = await params;
  try {
    const item = await owned(user.id, id, itemId);
    if (!item) return notFound();
    if (item.status === "committed")
      return NextResponse.json({ error: "Already committed" }, { status: 409 });
    await db().delete(scanItems).where(eq(scanItems.id, itemId));
    await touchSession(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

function emptyLabel(): YarnLabel {
  return {
    brand: null,
    product_line: null,
    fiber: null,
    weight_category: null,
    yardage: null,
    meters: null,
    skein_weight_grams: null,
    colorway: null,
    dye_lot: null,
    needle_size: null,
    swatch_hex: null,
  };
}
