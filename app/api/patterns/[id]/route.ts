import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "name",
  "designer",
  "external_url",
  "yarn_weight",
  "required_yardage",
  "needle_size",
  "notes",
]);

export async function PATCH(
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

  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const k of Object.keys(body)) {
    if (ALLOWED.has(k)) update[k] = body[k];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("patterns")
    .update(update)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
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

  // Best-effort cleanup of PDF + cover from storage
  const { data: row } = await supabase
    .from("patterns")
    .select("pdf_path, cover_url")
    .eq("id", id)
    .maybeSingle();
  if (row?.pdf_path) {
    await supabase.storage.from("pattern-pdfs").remove([row.pdf_path]);
  }
  if (row?.cover_url) {
    const marker = "/object/public/pattern-covers/";
    const i = row.cover_url.indexOf(marker);
    if (i >= 0) {
      const path = row.cover_url.slice(i + marker.length);
      await supabase.storage.from("pattern-covers").remove([path]);
    }
  }

  const { error } = await supabase.from("patterns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
