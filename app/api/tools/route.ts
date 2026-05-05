import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TABLES = { needle: "needles", hook: "hooks", notion: "notions" } as const;
type Kind = keyof typeof TABLES;

export async function POST(req: Request) {
  if (!hasSupabase())
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });

  const body = await req.json();
  const kind = body.kind as Kind;
  if (!kind || !TABLES[kind])
    return NextResponse.json({ error: "Bad kind" }, { status: 400 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let row: Record<string, unknown> = { user_id: user.id, quantity: Number(body.quantity ?? 1) };

  if (kind === "needle") {
    row = {
      ...row,
      size_us: str(body.sizeUs),
      size_mm: num(body.sizeMm),
      type: str(body.type),
      length_cm: num(body.lengthCm),
      material: str(body.material),
    };
  } else if (kind === "hook") {
    row = {
      ...row,
      size_us: str(body.sizeUs),
      size_mm: num(body.sizeMm),
      material: str(body.material),
    };
  } else {
    if (!body.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    row = { ...row, name: String(body.name).trim() };
  }

  const { data, error } = await supabase
    .from(TABLES[kind])
    .insert(row)
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(req: Request) {
  if (!hasSupabase())
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") as Kind | null;
  const id = searchParams.get("id");
  if (!kind || !id || !TABLES[kind])
    return NextResponse.json({ error: "Bad params" }, { status: 400 });

  const supabase = await supabaseServer();
  const { error } = await supabase.from(TABLES[kind]).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function str(v: unknown) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}
function num(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
