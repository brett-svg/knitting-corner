import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notFound, requireUser, serverError } from "@/lib/api";
import { nextSeq, ownedSession, runExtraction, storeImages, touchSession } from "@/lib/sessions";

export const runtime = "nodejs";
export const maxDuration = 60;

// Capture: store the photos, return immediately, extract in the background.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const images: string[] = Array.isArray(body.images) ? body.images : [];
  if (!images.length) return NextResponse.json({ error: "no images" }, { status: 400 });

  try {
    const session = await ownedSession(user.id, id);
    if (!session) return notFound();
    // A committed session that gets a new capture simply reopens.
    if (session.status !== "open") {
      await db()
        .update(schema.scanSessions)
        .set({ status: "open" })
        .where(eq(schema.scanSessions.id, id));
    }

    const imageKeys = await storeImages(user.id, images);
    const [item] = await db()
      .insert(schema.scanItems)
      .values({
        sessionId: id,
        userId: user.id,
        seq: await nextSeq(id),
        imageKeys,
        skeins: Math.max(1, Number(body.skeins ?? 1)),
        locationId: body.locationId || null,
        status: "captured",
      })
      .returning({ id: schema.scanItems.id, seq: schema.scanItems.seq });
    await touchSession(id);

    after(() => runExtraction(item.id, user.id));
    return NextResponse.json({ ok: true, id: item.id, seq: item.seq });
  } catch (err) {
    return serverError(err);
  }
}
