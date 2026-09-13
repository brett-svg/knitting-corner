import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { getObject, hasStorage } from "@/lib/storage";
import { gradientFromHex, pickSwatch } from "@/lib/swatch";

export const runtime = "nodejs";
export const maxDuration = 120;

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const ALLOWED_TYPES = new Set<string>(["image/jpeg", "image/png", "image/gif", "image/webp"]);

async function fetchAsBase64(key: string): Promise<{ mediaType: MediaType; data: string } | null> {
  try {
    const obj = await getObject(key);
    if (!obj) return null;
    const mediaType = (ALLOWED_TYPES.has(obj.contentType) ? obj.contentType : "image/jpeg") as MediaType;
    return { mediaType, data: obj.body.toString("base64") };
  } catch {
    return null;
  }
}

async function hexFromImage(
  anthropic: Anthropic,
  model: string,
  key: string
): Promise<string | null> {
  const img = await fetchAsBase64(key);
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
  const { user, fail } = await requireUser();
  if (fail) return fail;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const anthropic = apiKey && hasStorage() ? new Anthropic({ apiKey }) : null;

  try {
    const rows = await db()
      .select({ id: schema.yarns.id, colorway: schema.yarns.colorway, imageKey: schema.yarns.imageKey })
      .from(schema.yarns)
      .where(eq(schema.yarns.userId, user.id));

    let updated = 0;
    let viaAi = 0;
    let viaName = 0;
    for (const r of rows) {
      let swatch: string | null = null;
      if (anthropic && r.imageKey) {
        const hex = await hexFromImage(anthropic, model, r.imageKey);
        if (hex) {
          swatch = gradientFromHex(hex);
          viaAi++;
        }
      }
      if (!swatch) {
        swatch = pickSwatch(r.colorway);
        viaName++;
      }
      await db().update(schema.yarns).set({ swatch }).where(eq(schema.yarns.id, r.id));
      updated++;
    }
    return NextResponse.json({ ok: true, updated, total: rows.length, viaAi, viaName });
  } catch (err) {
    return serverError(err);
  }
}
