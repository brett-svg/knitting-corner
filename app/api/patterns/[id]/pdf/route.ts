import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "not configured" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: pattern, error } = await supabase
    .from("patterns")
    .select("pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !pattern?.pdf_path) {
    return NextResponse.json({ error: "no PDF" }, { status: 404 });
  }
  const signed = await supabase.storage
    .from("pattern-pdfs")
    .createSignedUrl(pattern.pdf_path, 60 * 5);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ error: signed.error?.message }, { status: 500 });
  }
  return NextResponse.redirect(signed.data.signedUrl);
}
