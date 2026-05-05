import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasSupabase())
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { name } = await req.json();
  const trimmed = String(name ?? "").trim();
  if (!trimmed)
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  const { data, error } = await supabase
    .from("storage_locations")
    .insert({ user_id: user.id, name: trimmed })
    .select("id,name")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, location: data });
}
