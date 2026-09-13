import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { hasStorage, objectKey, putObject } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const { user, fail } = await requireUser();
  if (fail) return fail;

  const fd = await req.formData();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const designer = strOrNull(fd.get("designer"));
  const external_url = strOrNull(fd.get("external_url"));
  const yarn_weight = strOrNull(fd.get("yarn_weight"));
  const needle_size = strOrNull(fd.get("needle_size"));
  const notes = strOrNull(fd.get("notes"));
  const yardage = numOrNull(fd.get("required_yardage"));
  const gauge = strOrNull(fd.get("gauge"));
  const sizes = strOrNull(fd.get("sizes"));
  const construction = strOrNull(fd.get("construction"));
  const techniques = strOrNull(fd.get("techniques"));
  const garment_type = strOrNull(fd.get("garment_type"));
  const recommended_yarn = strOrNull(fd.get("recommended_yarn"));

  let pdfKey: string | null = null;
  let coverKey: string | null = null;

  const pdf = fd.get("pdf");
  if (pdf instanceof File && pdf.size > 0) {
    if (!hasStorage()) {
      return NextResponse.json({ error: "File storage isn't configured" }, { status: 400 });
    }
    if (pdf.type !== "application/pdf") {
      return NextResponse.json({ error: "PDF must be application/pdf" }, { status: 400 });
    }
    if (pdf.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF exceeds 25MB" }, { status: 400 });
    }
    const buf = Buffer.from(await pdf.arrayBuffer());

    pdfKey = objectKey("pattern-pdfs", user.id, "pdf");
    try {
      await putObject(pdfKey, buf, "application/pdf");
    } catch (err) {
      return NextResponse.json(
        { error: `PDF upload failed: ${err instanceof Error ? err.message : "unknown"}` },
        { status: 500 }
      );
    }

    // Prefer a client-rendered cover (passed in formdata as "cover").
    // Fall back to server-side render via pdf-to-img if not provided.
    const incomingCover = fd.get("cover");
    let coverBytes: Buffer | null = null;
    let coverContentType = "image/jpeg";
    if (incomingCover instanceof File && incomingCover.size > 0) {
      coverBytes = Buffer.from(await incomingCover.arrayBuffer());
      coverContentType = incomingCover.type || "image/jpeg";
    } else {
      const png = await renderFirstPage(buf);
      if (png) {
        coverBytes = png;
        coverContentType = "image/png";
      }
    }
    if (coverBytes) {
      const ext = (coverContentType.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const key = objectKey("pattern-covers", user.id, ext);
      try {
        await putObject(key, coverBytes, coverContentType);
        coverKey = key;
      } catch (err) {
        console.warn("[patterns] cover upload failed:", err);
      }
    }
  }

  try {
    const [row] = await db()
      .insert(schema.patterns)
      .values({
        userId: user.id,
        name,
        designer,
        externalUrl: external_url,
        pdfKey,
        coverKey,
        yarnWeight: yarn_weight,
        requiredYardage: yardage,
        needleSize: needle_size,
        notes,
        gauge,
        sizes,
        construction,
        techniques,
        garmentType: garment_type,
        recommendedYarn: recommended_yarn,
      })
      .returning({ id: schema.patterns.id });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return serverError(err);
  }
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
