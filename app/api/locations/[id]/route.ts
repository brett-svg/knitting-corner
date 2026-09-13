import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";

export const runtime = "nodejs";

const { storageLocations } = schema;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;

  const { name } = await req.json();
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return NextResponse.json({ error: "Name required" }, { status: 400 });

  try {
    await db()
      .update(storageLocations)
      .set({ name: trimmed })
      .where(and(eq(storageLocations.id, id), eq(storageLocations.userId, user.id)));
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
    await db()
      .delete(storageLocations)
      .where(and(eq(storageLocations.id, id), eq(storageLocations.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
