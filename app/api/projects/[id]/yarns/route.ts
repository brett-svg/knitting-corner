import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notFound, requireUser, serverError } from "@/lib/api";

export const runtime = "nodejs";

const { projects, projectYarns, yarns } = schema;

async function ownedProject(id: string, userId: string) {
  return db().query.projects.findFirst({
    columns: { id: true, status: true },
    where: and(eq(projects.id, id), eq(projects.userId, userId)),
  });
}

// Clear the reserved flag if no remaining Active project uses this yarn.
async function maybeUnreserve(yarnId: string) {
  const stillActive = await db()
    .select({ projectId: projectYarns.projectId })
    .from(projectYarns)
    .innerJoin(projects, eq(projects.id, projectYarns.projectId))
    .where(and(eq(projectYarns.yarnId, yarnId), eq(projects.status, "Active")))
    .limit(1);
  if (!stillActive.length) {
    await db().update(yarns).set({ reserved: false }).where(eq(yarns.id, yarnId));
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;

  const { yarnId } = await req.json();
  if (!yarnId) return NextResponse.json({ error: "yarnId required" }, { status: 400 });

  try {
    const proj = await ownedProject(id, user.id);
    if (!proj) return notFound();
    const yarn = await db().query.yarns.findFirst({
      columns: { id: true },
      where: and(eq(yarns.id, yarnId), eq(yarns.userId, user.id)),
    });
    if (!yarn) return notFound();

    await db()
      .insert(projectYarns)
      .values({ projectId: id, yarnId })
      .onConflictDoNothing();
    if (proj.status === "Active") {
      await db().update(yarns).set({ reserved: true }).where(eq(yarns.id, yarnId));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;
  const yarnId = new URL(req.url).searchParams.get("yarnId");
  if (!yarnId) return NextResponse.json({ error: "yarnId required" }, { status: 400 });

  try {
    const proj = await ownedProject(id, user.id);
    if (!proj) return notFound();
    await db()
      .delete(projectYarns)
      .where(and(eq(projectYarns.projectId, id), eq(projectYarns.yarnId, yarnId)));
    await maybeUnreserve(yarnId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
