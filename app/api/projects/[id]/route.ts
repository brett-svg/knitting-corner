import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";

export const runtime = "nodejs";

const { projects } = schema;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;

  const body = await req.json();
  const update: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.notes === "string" || body.notes === null) update.notes = body.notes;
  if (typeof body.status === "string") {
    update.status = body.status;
    if (body.status === "Completed") update.finishedAt = new Date().toISOString().slice(0, 10);
  }
  if (typeof body.progress === "number")
    update.progress = String(Math.max(0, Math.min(1, body.progress)));
  if (typeof body.recipient === "string" || body.recipient === null)
    update.recipient = body.recipient;
  if (typeof body.giftDate === "string" || body.giftDate === null)
    update.giftDate = body.giftDate;

  try {
    await db()
      .update(projects)
      .set(update)
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
