import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 90;

type Extracted = {
  name: string | null;
  designer: string | null;
  yarn_weight:
    | "Lace"
    | "Fingering"
    | "Sport"
    | "DK"
    | "Worsted"
    | "Aran"
    | "Bulky"
    | null;
  required_yardage: number | null;
  needle_size: string | null;
  gauge: string | null;
  sizes: string | null;
  construction: string | null;
  techniques: string | null;
  garment_type: string | null;
  recommended_yarn: string | null;
  notes: string | null;
};

const TOOL = {
  name: "save_pattern_metadata",
  description: "Saves the structured metadata extracted from a knitting pattern PDF.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: ["string", "null"] as const,
        description: "Pattern name as printed (e.g. 'Camilla Sweater')",
      },
      designer: {
        type: ["string", "null"] as const,
        description:
          "Designer name or shop name (e.g. 'HipKnitShop', 'Hannah Fettig')",
      },
      yarn_weight: {
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
        description: "Yarn weight category. Infer from gauge if not explicit.",
      },
      required_yardage: {
        type: ["number", "null"] as const,
        description:
          "Total required yardage in YARDS. Convert from meters if given (1m ≈ 1.094yd). Use the M (medium) size if multiple sizes.",
      },
      needle_size: {
        type: ["string", "null"] as const,
        description:
          "Primary needle size (e.g. 'US 7 (4.5mm)' or '7 mm'). Include both US and metric when available.",
      },
      gauge: {
        type: ["string", "null"] as const,
        description:
          "Gauge spec, verbatim (e.g. '15 sts × 21 rows = 10 cm in stockinette on 7mm').",
      },
      sizes: {
        type: ["string", "null"] as const,
        description:
          "Available sizes as listed (e.g. 'XS (S) M (L) XL (2XL-3XL)').",
      },
      construction: {
        type: ["string", "null"] as const,
        description:
          "Construction method (e.g. 'top-down raglan', 'bottom-up seamless', 'modular').",
      },
      techniques: {
        type: ["string", "null"] as const,
        description:
          "Comma-separated key techniques (e.g. 'short rows, V-neck, raglan increases, German short rows').",
      },
      garment_type: {
        type: ["string", "null"] as const,
        description:
          "Garment type (e.g. 'sweater', 'cardigan', 'hat', 'shawl', 'socks', 'wrap').",
      },
      recommended_yarn: {
        type: ["string", "null"] as const,
        description:
          "Yarn the designer recommends, with quantity if stated (e.g. '12 skeins of Hip Wool').",
      },
      notes: {
        type: ["string", "null"] as const,
        description:
          "1-3 sentence summary of 'About the pattern' or notable construction details — what makes it distinctive.",
      },
    },
    required: [
      "name",
      "designer",
      "yarn_weight",
      "required_yardage",
      "needle_size",
      "gauge",
      "sizes",
      "construction",
      "techniques",
      "garment_type",
      "recommended_yarn",
      "notes",
    ],
  },
};

const SYSTEM = `You read a knitting pattern PDF and extract its metadata into structured fields.
Always call save_pattern_metadata with every field. Use null when something isn't present.
- For required_yardage, prefer the M size when multiple sizes are listed.
- For yarn_weight, map "fingering"/"4-ply" → Fingering, "DK"/"8-ply" → DK, etc.
- For garment_type, normalize to a single noun: sweater, cardigan, hat, scarf, shawl, wrap, socks, mittens, blanket, cowl, etc.
- For techniques, list 2-6 distinctive ones; skip generic ones like "knit" and "purl".
- Notes should be a brief description of what the pattern is — not the abbreviation key.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set" },
      { status: 400 }
    );
  }

  let pdfFile: File | null = null;
  try {
    const fd = await req.formData();
    const value = fd.get("pdf");
    if (value instanceof File) pdfFile = value;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!pdfFile) {
    return NextResponse.json({ error: "No PDF provided" }, { status: 400 });
  }
  if (pdfFile.type !== "application/pdf") {
    return NextResponse.json(
      { error: "File must be application/pdf" },
      { status: 400 }
    );
  }
  if (pdfFile.size > 32 * 1024 * 1024) {
    return NextResponse.json(
      { error: "PDF exceeds 32MB" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await pdfFile.arrayBuffer());
  const base64 = buf.toString("base64");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extract this pattern's metadata and call save_pattern_metadata.",
            },
          ],
        },
      ],
    });

    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return NextResponse.json(
        { error: "Model did not return structured output" },
        { status: 502 }
      );
    }
    return NextResponse.json({ extracted: block.input as Extracted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
