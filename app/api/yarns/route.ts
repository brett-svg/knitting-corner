import { NextResponse } from "next/server";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const SWATCHES = [
  "linear-gradient(135deg,#F472B6 0%,#C084FC 45%,#60A5FA 90%)",
  "linear-gradient(135deg,#FDBA74 0%,#FB7185 60%,#9F1239 100%)",
  "linear-gradient(135deg,#A7F3D0 0%,#5EEAD4 50%,#60A5FA 100%)",
  "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#FB7185 100%)",
  "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#6D28D9 100%)",
];

const BUCKET = "yarn-photos";

function decodeDataUrl(dataUrl: string) {
  const m = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return {
    contentType: m[1],
    bytes: Buffer.from(m[2], "base64"),
    ext: m[1].split("/")[1].replace("jpeg", "jpg").split("+")[0],
  };
}

export async function POST(req: Request) {
  const body = await req.json();
  const label = body.label ?? {};
  const skeins = Number(body.skeins ?? 1);
  const images: string[] = Array.isArray(body.images) ? body.images : [];

  if (!hasSupabase()) {
    return NextResponse.json({
      ok: true,
      persisted: false,
      note: "Supabase not configured — accepted but not stored.",
    });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Duplicate detection: same brand + colorway + dye_lot for this user.
  const force = Boolean(body.force);
  if (!force && label.brand && label.colorway) {
    const { data: existing } = await supabase
      .from("yarns")
      .select("id, brand, product_line, colorway, dye_lot, skeins, swatch, image_url")
      .eq("user_id", user.id)
      .ilike("brand", label.brand)
      .ilike("colorway", label.colorway);
    const dupe = (existing ?? []).find(
      (e) => (e.dye_lot ?? "").trim() === (label.dye_lot ?? "").trim()
    );
    if (dupe) {
      return NextResponse.json(
        {
          duplicate: {
            id: dupe.id,
            brand: dupe.brand,
            productLine: dupe.product_line,
            colorway: dupe.colorway,
            dyeLot: dupe.dye_lot,
            skeins: dupe.skeins,
            swatch: dupe.swatch,
            imageUrl: dupe.image_url,
          },
          incomingSkeins: skeins,
        },
        { status: 409 }
      );
    }
  }

  // Upload first image (if any) — others can be wired later for back/side shots.
  let imageUrl: string | null = null;
  const first = images[0];
  if (first?.startsWith("data:image/")) {
    const decoded = decodeDataUrl(first);
    if (decoded) {
      const path = `${user.id}/${crypto.randomUUID()}.${decoded.ext}`;
      const up = await supabase.storage
        .from(BUCKET)
        .upload(path, decoded.bytes, {
          contentType: decoded.contentType,
          upsert: false,
        });
      if (up.error) {
        return NextResponse.json(
          { error: `Upload failed: ${up.error.message}` },
          { status: 500 }
        );
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }
  }

  const swatch = SWATCHES[Math.floor(Math.random() * SWATCHES.length)];

  const { data, error } = await supabase
    .from("yarns")
    .insert({
      user_id: user.id,
      brand: label.brand,
      product_line: label.product_line,
      fiber: label.fiber,
      weight_category: label.weight_category,
      yardage: label.yardage,
      meters: label.meters,
      skein_weight_grams: label.skein_weight_grams,
      colorway: label.colorway,
      dye_lot: label.dye_lot,
      needle_size: label.needle_size,
      skeins,
      swatch,
      image_url: imageUrl,
      storage_location_id: body.locationId || null,
      notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, persisted: true, id: data.id, imageUrl });
}
