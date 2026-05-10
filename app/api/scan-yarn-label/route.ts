import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

type ScanRequest = {
  // data URLs (data:image/jpeg;base64,...)
  images: string[];
};

type YarnLabel = {
  brand: string | null;
  product_line: string | null;
  fiber: string | null;
  weight_category: string | null;
  yardage: number | null;
  meters: number | null;
  skein_weight_grams: number | null;
  colorway: string | null;
  dye_lot: string | null;
  needle_size: string | null;
  swatch_hex: string | null;
};

const TOOL = {
  name: "save_yarn_label",
  description:
    "Saves the structured yarn-label data extracted from the photos.",
  input_schema: {
    type: "object" as const,
    properties: {
      brand: { type: ["string", "null"] as const, description: "e.g. Malabrigo" },
      product_line: { type: ["string", "null"] as const, description: "e.g. Rios" },
      fiber: { type: ["string", "null"] as const, description: "Fiber composition string" },
      weight_category: {
        type: ["string", "null"] as const,
        enum: [
          "Lace",
          "Fingering",
          "Sport",
          "DK",
          "Worsted",
          "Aran",
          "Bulky",
          null,
        ],
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

function decodeDataUrl(dataUrl: string) {
  const m = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mediaType: m[1], data: m[2] };
}

export async function POST(req: Request) {
  let body: ScanRequest;
  try {
    body = (await req.json()) as ScanRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.images?.length) {
    return NextResponse.json({ error: "no images" }, { status: 400 });
  }

  // Dev fallback: no key wired → return a plausible mock so the UI flow works.
  if (!process.env.ANTHROPIC_API_KEY) {
    const mock: YarnLabel = {
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
    return NextResponse.json({ label: mock, mocked: true });
  }

  const decoded = body.images.map(decodeDataUrl).filter(Boolean) as Array<{
    mediaType: string;
    data: string;
  }>;
  if (decoded.length === 0) {
    return NextResponse.json(
      { error: "Images must be base64 data URLs" },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

  try {
    const content: Anthropic.ContentBlockParam[] = [
      ...decoded.map(
        (img) =>
          ({
            type: "image",
            source: {
              type: "base64",
              media_type: img.mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: img.data,
            },
          }) satisfies Anthropic.ImageBlockParam
      ),
      {
        type: "text",
        text: "Extract the yarn label data and call save_yarn_label.",
      },
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
      return NextResponse.json(
        { error: "Model did not return structured output" },
        { status: 502 }
      );
    }
    return NextResponse.json({ label: block.input as YarnLabel, mocked: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "scan failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
