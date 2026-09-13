import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { listSessions } from "@/lib/sessions";

export const runtime = "nodejs";

export async function GET() {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  try {
    return NextResponse.json({ sessions: await listSessions(user.id) });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const body = await req.json().catch(() => ({}));
  const name =
    String(body.name ?? "").trim() ||
    `Count · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  try {
    const [row] = await db()
      .insert(schema.scanSessions)
      .values({ userId: user.id, name, defaultLocationId: body.defaultLocationId || null })
      .returning({ id: schema.scanSessions.id });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return serverError(err);
  }
}
