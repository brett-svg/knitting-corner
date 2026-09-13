import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { user, fail } = await requireUser();
  if (fail) return fail;

  const { name } = await req.json();
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return NextResponse.json({ error: "Name required" }, { status: 400 });

  try {
    const [location] = await db()
      .insert(schema.storageLocations)
      .values({ userId: user.id, name: trimmed })
      .returning({ id: schema.storageLocations.id, name: schema.storageLocations.name });
    return NextResponse.json({ ok: true, location });
  } catch (err) {
    return serverError(err);
  }
}
