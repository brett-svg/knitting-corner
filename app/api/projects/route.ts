import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";

export const runtime = "nodejs";

const HEROES = [
  "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#C084FC 100%)",
  "linear-gradient(135deg,#FDBA74 0%,#FB7185 60%,#9F1239 100%)",
  "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#60A5FA 100%)",
  "linear-gradient(135deg,#A7F3D0 0%,#5EEAD4 50%,#60A5FA 100%)",
  "linear-gradient(135deg,#FFE4E6 0%,#FBCFE8 50%,#C084FC 100%)",
];

export async function POST(req: Request) {
  const { user, fail } = await requireUser();
  if (fail) return fail;

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const patternId: string | null = body.patternId || null;
  const yarnIds: string[] = Array.isArray(body.yarnIds) ? body.yarnIds : [];
  const status: string = body.status ?? "Planned";

  try {
    const id = await db().transaction(async (tx) => {
      const [proj] = await tx
        .insert(schema.projects)
        .values({
          userId: user.id,
          name,
          patternId,
          status,
          progress: "0",
          notes: body.notes || null,
          hero: HEROES[Math.floor(Math.random() * HEROES.length)],
          recipient: body.recipient?.trim() || null,
          giftDate: body.giftDate || null,
        })
        .returning({ id: schema.projects.id });

      if (yarnIds.length) {
        // Only link yarns the user actually owns.
        const owned = await tx
          .select({ id: schema.yarns.id })
          .from(schema.yarns)
          .where(and(eq(schema.yarns.userId, user.id), inArray(schema.yarns.id, yarnIds)));
        const ids = owned.map((y) => y.id);
        if (ids.length) {
          await tx
            .insert(schema.projectYarns)
            .values(ids.map((yarnId) => ({ projectId: proj.id, yarnId })));
          if (status === "Active") {
            await tx
              .update(schema.yarns)
              .set({ reserved: true })
              .where(inArray(schema.yarns.id, ids));
          }
        }
      }
      return proj.id;
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError(err);
  }
}
