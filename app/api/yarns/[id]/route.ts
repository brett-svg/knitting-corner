import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "brand",
  "product_line",
  "fiber",
  "weight_category",
  "yardage",
  "meters",
  "skein_weight_grams",
  "colorway",
  "dye_lot",
  "needle_size",
  "skeins",
  "reserved",
  "storage_location_id",
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabase())
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });

  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const k of Object.keys(body)) {
    if (ALLOWED.has(k)) update[k] = body[k];
  }
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { error } = await supabase.from("yarns").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabase())
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });

  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Try to remove the photo too — best-effort.
  const { data: row } = await supabase
    .from("yarns")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  if (row?.image_url) {
    const marker = "/object/public/yarn-photos/";
    const i = row.image_url.indexOf(marker);
    if (i >= 0) {
      const path = row.image_url.slice(i + marker.length);
      await supabase.storage.from("yarn-photos").remove([path]);
    }
  }

  const { error } = await supabase.from("yarns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
