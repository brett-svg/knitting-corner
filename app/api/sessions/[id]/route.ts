import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notFound, requireUser, serverError } from "@/lib/api";
import { getSession, ownedSession } from "@/lib/sessions";

export const runtime = "nodejs";

// Polled by both the phone (tray) and the laptop (review table).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;
  try {
    const data = await getSession(user.id, id);
    if (!data) return notFound();
    return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;
  const body = await req.json();
  const update: Partial<typeof schema.scanSessions.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if ("defaultLocationId" in body) update.defaultLocationId = body.defaultLocationId || null;
  if (body.status === "open" || body.status === "committed") update.status = body.status;
  try {
    if (!(await ownedSession(user.id, id))) return notFound();
    await db().update(schema.scanSessions).set(update).where(eq(schema.scanSessions.id, id));
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
      .delete(schema.scanSessions)
      .where(and(eq(schema.scanSessions.id, id), eq(schema.scanSessions.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
