import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function maybeUnreserve(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  yarnId: string
) {
  // If no remaining Active project references this yarn, clear the reserved flag.
  const { data, error } = await supabase
    .from("project_yarns")
    .select("project_id, projects!inner(status)")
    .eq("yarn_id", yarnId)
    .eq("projects.status", "Active");
  if (error) return;
  if (!data || data.length === 0) {
    await supabase.from("yarns").update({ reserved: false }).eq("id", yarnId);
  }
}

export async function POST(
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

  const { yarnId } = await req.json();
  if (!yarnId)
    return NextResponse.json({ error: "yarnId required" }, { status: 400 });

  const { error } = await supabase
    .from("project_yarns")
    .insert({ project_id: id, yarn_id: yarnId });
  if (error && !/duplicate/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If the project is Active, mark this skein as reserved
  const { data: proj } = await supabase
    .from("projects")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (proj?.status === "Active") {
    await supabase.from("yarns").update({ reserved: true }).eq("id", yarnId);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabase())
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const yarnId = searchParams.get("yarnId");
  if (!yarnId)
    return NextResponse.json({ error: "yarnId required" }, { status: 400 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { error } = await supabase
    .from("project_yarns")
    .delete()
    .eq("project_id", id)
    .eq("yarn_id", yarnId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await maybeUnreserve(supabase, yarnId);

  return NextResponse.json({ ok: true });
}
