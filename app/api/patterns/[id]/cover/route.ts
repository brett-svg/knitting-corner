import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const COVER_BUCKET = "pattern-covers";

// Accepts a client-rendered cover image (multipart "cover") and stores it
// as the pattern's cover_url. Used by the "Regenerate cover" button on
// existing patterns whose initial server-side render failed.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabase())
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 400 }
    );

  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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

  // Best-effort delete previous cover so we don't leak storage
  const { data: existing } = await supabase
    .from("patterns")
    .select("cover_url")
    .eq("id", id)
    .maybeSingle();
  if (existing?.cover_url) {
    const marker = "/object/public/pattern-covers/";
    const i = existing.cover_url.indexOf(marker);
    if (i >= 0) {
      const path = existing.cover_url.slice(i + marker.length);
      await supabase.storage.from(COVER_BUCKET).remove([path]);
    }
  }

  const buf = Buffer.from(await coverFile.arrayBuffer());
  const ext = (coverFile.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, buf, { contentType: coverFile.type, upsert: false });
  if (up.error)
    return NextResponse.json(
      { error: `Upload failed: ${up.error.message}` },
      { status: 500 }
    );
  const cover_url = supabase.storage
    .from(COVER_BUCKET)
    .getPublicUrl(path).data.publicUrl;

  const { error } = await supabase
    .from("patterns")
    .update({ cover_url })
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, cover_url });
}
