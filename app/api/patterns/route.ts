import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const PDF_BUCKET = "pattern-pdfs";
const COVER_BUCKET = "pattern-covers";

async function renderFirstPage(pdf: Buffer): Promise<Buffer | null> {
  try {
    const { pdf: pdfToImg } = await import("pdf-to-img");
    const doc = await pdfToImg(pdf, { scale: 1.6 });
    for await (const page of doc) {
      return Buffer.from(page);
    }
  } catch (err) {
    console.warn("[patterns] cover render failed:", err);
  }
  return null;
}

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

  const fd = await req.formData();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const designer = strOrNull(fd.get("designer"));
  const external_url = strOrNull(fd.get("external_url"));
  const yarn_weight = strOrNull(fd.get("yarn_weight"));
  const needle_size = strOrNull(fd.get("needle_size"));
  const notes = strOrNull(fd.get("notes"));
  const yardage = numOrNull(fd.get("required_yardage"));

  let pdf_path: string | null = null;
  let cover_url: string | null = null;

  const pdf = fd.get("pdf");
  if (pdf instanceof File && pdf.size > 0) {
    if (pdf.type !== "application/pdf") {
      return NextResponse.json({ error: "PDF must be application/pdf" }, { status: 400 });
    }
    if (pdf.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF exceeds 25MB" }, { status: 400 });
    }
    const buf = Buffer.from(await pdf.arrayBuffer());

    pdf_path = `${user.id}/${crypto.randomUUID()}.pdf`;
    const upPdf = await supabase.storage
      .from(PDF_BUCKET)
      .upload(pdf_path, buf, { contentType: "application/pdf", upsert: false });
    if (upPdf.error) {
      return NextResponse.json(
        { error: `PDF upload failed: ${upPdf.error.message}` },
        { status: 500 }
      );
    }

    const png = await renderFirstPage(buf);
    if (png) {
      const coverPath = `${user.id}/${crypto.randomUUID()}.png`;
      const upCover = await supabase.storage
        .from(COVER_BUCKET)
        .upload(coverPath, png, { contentType: "image/png", upsert: false });
      if (!upCover.error) {
        cover_url = supabase.storage
          .from(COVER_BUCKET)
          .getPublicUrl(coverPath).data.publicUrl;
      }
    }
  }

  const { data, error } = await supabase
    .from("patterns")
    .insert({
      user_id: user.id,
      name,
      designer,
      external_url,
      pdf_path,
      cover_url,
      yarn_weight,
      required_yardage: yardage,
      needle_size,
      notes,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}

function strOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}
function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
