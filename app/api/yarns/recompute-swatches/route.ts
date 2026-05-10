import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { hasSupabase, supabaseServer } from "@/lib/supabase/server";
import { gradientFromHex, pickSwatch } from "@/lib/swatch";

export const runtime = "nodejs";
export const maxDuration = 120;

async function fetchAsBase64(url: string): Promise<{
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
} | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ]);
    const mediaType = (
      allowed.has(ct) ? ct : "image/jpeg"
    ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const buf = Buffer.from(await res.arrayBuffer());
    return { mediaType, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

async function hexFromImage(
  anthropic: Anthropic,
  model: string,
  url: string
): Promise<string | null> {
  const img = await fetchAsBase64(url);
  if (!img) return null;
  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 80,
      system:
        "You inspect a photo of a yarn skein and return the single most representative color of the YARN ITSELF (not the label, not the background) as a 6-digit hex. Reply with nothing but the hex string, e.g. #A3B98C.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: img.mediaType,
                data: img.data,
              },
            },
            { type: "text", text: "Hex of the yarn's dominant color?" },
          ],
        },
      ],
    });
    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const m = text.match(/#?[0-9a-f]{6}/i);
    return m ? `#${m[0].replace(/^#/, "")}` : null;
  } catch (err) {
    console.warn("[recompute] hexFromImage:", err);
    return null;
  }
}

export async function POST() {
  if (!hasSupabase())
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 400 }
    );
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("yarns")
    .select("id, colorway, image_url");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

  let updated = 0;
  let viaAi = 0;
  let viaName = 0;
  for (const r of rows ?? []) {
    let swatch: string | null = null;
    if (anthropic && r.image_url) {
      const hex = await hexFromImage(anthropic, model, r.image_url);
      if (hex) {
        swatch = gradientFromHex(hex);
        viaAi++;
      }
    }
    if (!swatch) {
      swatch = pickSwatch(r.colorway);
      viaName++;
    }
    const { error: e } = await supabase
      .from("yarns")
      .update({ swatch })
      .eq("id", r.id);
    if (!e) updated++;
  }

  return NextResponse.json({
    ok: true,
    updated,
    total: rows?.length ?? 0,
    viaAi,
    viaName,
  });
}
