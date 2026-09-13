import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notFound, requireUser, serverError } from "@/lib/api";
import { deleteObject, fileUrl, hasStorage, objectKey, putObject } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const { patterns } = schema;

// Accepts a client-rendered cover image (multipart "cover") and stores it
// as the pattern's cover. Used by the "Regenerate cover" button on
// existing patterns whose initial server-side render failed.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  if (!hasStorage())
    return NextResponse.json({ error: "File storage isn't configured" }, { status: 400 });
  const { id } = await params;

  let coverFile: File | null = null;
  try {
    const fd = await req.formData();
    const value = fd.get("cover");
    if (value instanceof File) coverFile = value;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!coverFile || !coverFile.type.startsWith("image/")) {
    return NextResponse.json({ error: "Need an image file" }, { status: 400 });
  }

  try {
    const existing = await db().query.patterns.findFirst({
      columns: { coverKey: true },
      where: and(eq(patterns.id, id), eq(patterns.userId, user.id)),
    });
    if (!existing) return notFound();

    const buf = Buffer.from(await coverFile.arrayBuffer());
    const ext = (coverFile.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const key = objectKey("pattern-covers", user.id, ext);
    await putObject(key, buf, coverFile.type);

    await db()
      .update(patterns)
      .set({ coverKey: key })
      .where(and(eq(patterns.id, id), eq(patterns.userId, user.id)));
    // Best-effort delete previous cover so we don't leak storage
    await deleteObject(existing.coverKey);

    return NextResponse.json({ ok: true, cover_url: fileUrl(key) });
  } catch (err) {
    return serverError(err);
  }
}
