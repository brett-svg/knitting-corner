import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { num, requireUser, serverError, str } from "@/lib/api";

export const runtime = "nodejs";

type Kind = "needle" | "hook" | "notion";
const KINDS = new Set<Kind>(["needle", "hook", "notion"]);

export async function POST(req: Request) {
  const { user, fail } = await requireUser();
  if (fail) return fail;

  const body = await req.json();
  const kind = body.kind as Kind;
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Bad kind" }, { status: 400 });

  const quantity = Number(body.quantity ?? 1);
  try {
    let id: string;
    if (kind === "needle") {
      [{ id }] = await db()
        .insert(schema.needles)
        .values({
          userId: user.id,
          quantity,
          sizeUs: str(body.sizeUs),
          sizeMm: num(body.sizeMm)?.toString() ?? null,
          type: str(body.type),
          lengthCm: num(body.lengthCm),
          material: str(body.material),
        })
        .returning({ id: schema.needles.id });
    } else if (kind === "hook") {
      [{ id }] = await db()
        .insert(schema.hooks)
        .values({
          userId: user.id,
          quantity,
          sizeUs: str(body.sizeUs),
          sizeMm: num(body.sizeMm)?.toString() ?? null,
          material: str(body.material),
        })
        .returning({ id: schema.hooks.id });
    } else {
      const name = str(body.name);
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
      [{ id }] = await db()
        .insert(schema.notions)
        .values({ userId: user.id, quantity, name })
        .returning({ id: schema.notions.id });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: Request) {
  const { user, fail } = await requireUser();
  if (fail) return fail;

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") as Kind | null;
  const id = searchParams.get("id");
  if (!kind || !id || !KINDS.has(kind))
    return NextResponse.json({ error: "Bad params" }, { status: 400 });

  const table =
    kind === "needle" ? schema.needles : kind === "hook" ? schema.hooks : schema.notions;
  try {
    await db()
      .delete(table)
      .where(and(eq(table.id, id), eq(table.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
