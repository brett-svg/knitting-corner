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

// Normalize a brand/colorway/dye-lot string for fuzzy comparison:
// lowercase, strip punctuation, collapse whitespace, drop common
// suffix noise like "yarns", "yarn co", "yarn company", "ltd".
function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[®™©.,'"`!?]/g, "")
    .replace(/\s+(yarn(s)?( co(mpany)?)?|ltd|inc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sameYarn(
  a: { brand: string | null; colorway: string | null; dye_lot: string | null },
  b: { brand: string | null; colorway: string | null; dye_lot: string | null }
): boolean {
  const aBrand = normalize(a.brand);
  const bBrand = normalize(b.brand);
  // Brand: exact-after-normalization OR one is a substring of the other
  // (handles "Lion Brand" vs "Lion Brand Yarn Company" extraction wobble).
  const brandMatches =
    !!aBrand &&
    !!bBrand &&
    (aBrand === bBrand || aBrand.includes(bBrand) || bBrand.includes(aBrand));
  if (!brandMatches) return false;

  const aColor = normalize(a.colorway);
  const bColor = normalize(b.colorway);
  if (!aColor || !bColor || aColor !== bColor) return false;

  // Dye lot is the strongest tiebreaker. If both have lots, they must match.
  // If neither has one, treat as match. If only one has one, treat as match
  // too (the AI may have skipped it on one scan).
  const aLot = normalize(a.dye_lot);
  const bLot = normalize(b.dye_lot);
  if (aLot && bLot && aLot !== bLot) return false;
  return true;
}

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

  // Duplicate detection: same yarn for this user, normalized comparison.
  const force = Boolean(body.force);
  if (!force && label.brand && label.colorway) {
    const { data: existing } = await supabase
      .from("yarns")
      .select(
        "id, brand, product_line, colorway, dye_lot, skeins, swatch, image_url"
      )
      .eq("user_id", user.id);
    const dupe = (existing ?? []).find((e) =>
      sameYarn(
        { brand: e.brand, colorway: e.colorway, dye_lot: e.dye_lot },
        {
          brand: label.brand,
          colorway: label.colorway,
          dye_lot: label.dye_lot,
        }
      )
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
