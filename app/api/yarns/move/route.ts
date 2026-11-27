import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notFound, requireUser, serverError } from "@/lib/api";

export const runtime = "nodejs";

const { yarns, storageLocations } = schema;

// Move many yarns to one storage location (or clear it with locationId: null).
export async function POST(req: Request) {
  const { user, fail } = await requireUser();
  if (fail) return fail;

  const body = (await req.json().catch(() => ({}))) as {
    ids?: unknown;
    locationId?: unknown;
  };
  const ids = Array.isArray(body.ids)
    ? Array.from(new Set(body.ids.filter((v): v is string => typeof v === "string" && !!v)))
    : [];
  if (!ids.length) return NextResponse.json({ error: "No yarn selected" }, { status: 400 });
  if (ids.length > 1000)
    return NextResponse.json({ error: "Too many yarns at once" }, { status: 400 });

  const locationId =
    typeof body.locationId === "string" && body.locationId ? body.locationId : null;

  try {
    if (locationId) {
      const [loc] = await db()
        .select({ id: storageLocations.id })
        .from(storageLocations)
        .where(and(eq(storageLocations.id, locationId), eq(storageLocations.userId, user.id)));
      if (!loc) return notFound();
    }

    const moved = await db()
      .update(yarns)
      .set({ storageLocationId: locationId })
      .where(and(eq(yarns.userId, user.id), inArray(yarns.id, ids)))
      .returning({ id: yarns.id });
    return NextResponse.json({ ok: true, moved: moved.length });
  } catch (err) {
    return serverError(err);
  }
}
