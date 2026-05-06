import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 400 }
    );
  }
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.notes === "string" || body.notes === null) update.notes = body.notes;
  if (typeof body.status === "string") {
    update.status = body.status;
    if (body.status === "Completed") {
      update.finished_at = new Date().toISOString().slice(0, 10);
    }
  }
  if (typeof body.progress === "number")
    update.progress = Math.max(0, Math.min(1, body.progress));
  if (typeof body.recipient === "string" || body.recipient === null)
    update.recipient = body.recipient;
  if (typeof body.giftDate === "string" || body.giftDate === null)
    update.gift_date = body.giftDate;

  const { error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
