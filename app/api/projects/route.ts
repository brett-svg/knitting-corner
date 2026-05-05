import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const HEROES = [
  "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#C084FC 100%)",
  "linear-gradient(135deg,#FDBA74 0%,#FB7185 60%,#9F1239 100%)",
  "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#60A5FA 100%)",
  "linear-gradient(135deg,#A7F3D0 0%,#5EEAD4 50%,#60A5FA 100%)",
  "linear-gradient(135deg,#FFE4E6 0%,#FBCFE8 50%,#C084FC 100%)",
];

export async function POST(req: Request) {
  if (!hasSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 400 }
    );
  }
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const patternId: string | null = body.patternId || null;
  const yarnIds: string[] = Array.isArray(body.yarnIds) ? body.yarnIds : [];
  const status: string = body.status ?? "Planned";
  const notes: string | null = body.notes || null;

  const hero = HEROES[Math.floor(Math.random() * HEROES.length)];

  const { data: proj, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      pattern_id: patternId,
      status,
      progress: 0,
      notes,
      hero,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (yarnIds.length) {
    const rows = yarnIds.map((yid) => ({ project_id: proj.id, yarn_id: yid }));
    const { error: linkErr } = await supabase
      .from("project_yarns")
      .insert(rows);
    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }
    if (status === "Active") {
      await supabase
        .from("yarns")
        .update({ reserved: true })
        .in("id", yarnIds);
    }
  }

  return NextResponse.json({ ok: true, id: proj.id });
}
