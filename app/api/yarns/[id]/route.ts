import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

const { yarns } = schema;

// snake_case API field → schema column
const ALLOWED: Record<string, keyof typeof yarns.$inferInsert> = {
  brand: "brand",
  product_line: "productLine",
  fiber: "fiber",
  weight_category: "weightCategory",
  yardage: "yardage",
  meters: "meters",
  skein_weight_grams: "skeinWeightGrams",
  colorway: "colorway",
  dye_lot: "dyeLot",
  needle_size: "needleSize",
  skeins: "skeins",
  reserved: "reserved",
  storage_location_id: "storageLocationId",
  notes: "notes",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;

  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const [k, col] of Object.entries(ALLOWED)) {
    if (k in body) update[col] = body[k];
  }
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    await db()
      .update(yarns)
      .set(update)
      .where(and(eq(yarns.id, id), eq(yarns.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;

  try {
    const [row] = await db()
      .delete(yarns)
      .where(and(eq(yarns.id, id), eq(yarns.userId, user.id)))
      .returning({ imageKey: yarns.imageKey });
    if (row?.imageKey) await deleteObject(row.imageKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
