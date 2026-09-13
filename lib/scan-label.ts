// Label extraction: photos in, structured (and Ravelry-canonicalized) label out.
// Shared by the one-off scan endpoint and the inventory-session pipeline.

import Anthropic from "@anthropic-ai/sdk";
import { resolveWithRavelry, type RavelryMatch, type YarnLabel } from "@/lib/resolve-yarn";

export type ImageInput = { mediaType: ImageMediaType; data: string }; // base64
export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type Extraction = {
  label: YarnLabel;
  raw: YarnLabel;
  ravelry: RavelryMatch;
  mocked: boolean;
};

const TOOL = {
  name: "save_yarn_label",
  description: "Saves the structured yarn-label data extracted from the photos.",
  input_schema: {
    type: "object" as const,
    properties: {
      brand: { type: ["string", "null"] as const, description: "e.g. Malabrigo" },
      product_line: { type: ["string", "null"] as const, description: "e.g. Rios" },
      fiber: { type: ["string", "null"] as const, description: "Fiber composition string" },
      weight_category: {
        type: ["string", "null"] as const,
        enum: ["Lace", "Fingering", "Sport", "DK", "Worsted", "Aran", "Bulky", null],
      },
      yardage: { type: ["number", "null"] as const, description: "Yards per skein" },
      meters: { type: ["number", "null"] as const, description: "Meters per skein" },
      skein_weight_grams: { type: ["number", "null"] as const },
      colorway: { type: ["string", "null"] as const, description: "Color name" },
      dye_lot: { type: ["string", "null"] as const, description: "Dye lot code" },
      needle_size: { type: ["string", "null"] as const },
      swatch_hex: {
        type: ["string", "null"] as const,
        description:
          "The dominant color of the actual yarn fiber as a 6-digit hex (e.g. '#A3B98C' for sage). Look at the yarn itself, not the packaging or label artwork. If multiple colors are present (variegated/self-striping), pick the most prominent.",
      },
    },
    required: [
      "brand",
      "product_line",
      "fiber",
      "weight_category",
      "yardage",
      "meters",
      "skein_weight_grams",
      "colorway",
      "dye_lot",
      "needle_size",
      "swatch_hex",
    ],
  },
};

const SYSTEM = `You extract structured yarn-label data from photos of a yarn ball band.
- Always call the save_yarn_label tool with all fields. Use null when not visible.
- weight_category MUST be one of: Lace, Fingering, Sport, DK, Worsted, Aran, Bulky (or null).
- yardage in yards, meters in meters, skein_weight_grams in grams.
- colorway is the human-readable name (e.g. "Aniversario").
- dye_lot is the alphanumeric lot code.
- Infer reasonable values when packaging makes them obvious (metric ↔ imperial conversions).
- swatch_hex must be the actual fiber color you see, not the colorway name's literal meaning. If the label says "Sage" but the yarn itself looks olive, return olive's hex.`;

const MOCK: YarnLabel = {
  brand: "Malabrigo",
  product_line: "Rios",
  fiber: "100% Superwash Merino",
  weight_category: "Worsted",
  yardage: 210,
  meters: 192,
  skein_weight_grams: 100,
  colorway: "Aniversario",
  dye_lot: "0823",
  needle_size: "US 7 (4.5mm)",
  swatch_hex: "#7E2D5F",
};

const ALLOWED_TYPES = new Set<string>(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function decodeDataUrl(dataUrl: string): ImageInput | null {
  const m = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mediaType = (ALLOWED_TYPES.has(m[1]) ? m[1] : "image/jpeg") as ImageMediaType;
  return { mediaType, data: m[2] };
}

export async function extractLabel(images: ImageInput[]): Promise<Extraction> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Dev fallback: no key wired → plausible mock so the UI flow works.
    const resolved = await resolveWithRavelry(MOCK);
    return { ...resolved, raw: MOCK, mocked: true };
  }
  if (!images.length) throw new Error("no images");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

  const content: Anthropic.ContentBlockParam[] = [
    ...images.map(
      (img) =>
        ({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.data },
        }) satisfies Anthropic.ImageBlockParam
    ),
    { type: "text", text: "Extract the yarn label data and call save_yarn_label." },
  ];

  const message = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [{ role: "user", content }],
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Model did not return structured output");
  }
  const raw = block.input as YarnLabel;
  const resolved = await resolveWithRavelry(raw, { anthropic, model });
  return { ...resolved, raw, mocked: false };
}
