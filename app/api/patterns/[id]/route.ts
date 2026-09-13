import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

const { patterns } = schema;

// snake_case API field → schema column
const ALLOWED: Record<string, keyof typeof patterns.$inferInsert> = {
  name: "name",
  designer: "designer",
  external_url: "externalUrl",
  yarn_weight: "yarnWeight",
  required_yardage: "requiredYardage",
  needle_size: "needleSize",
  notes: "notes",
  gauge: "gauge",
  sizes: "sizes",
  construction: "construction",
  techniques: "techniques",
  garment_type: "garmentType",
  recommended_yarn: "recommendedYarn",
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
      .update(patterns)
      .set(update)
      .where(and(eq(patterns.id, id), eq(patterns.userId, user.id)));
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
      .delete(patterns)
      .where(and(eq(patterns.id, id), eq(patterns.userId, user.id)))
      .returning({ pdfKey: patterns.pdfKey, coverKey: patterns.coverKey });
    // Best-effort cleanup of PDF + cover from storage
    await Promise.all([deleteObject(row?.pdfKey), deleteObject(row?.coverKey)]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
