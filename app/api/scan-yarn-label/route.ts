import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

type ScanRequest = {
  // data URLs (data:image/jpeg;base64,...) or remote URLs
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
};

const SCHEMA = {
  name: "yarn_label",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      brand: { type: ["string", "null"] },
      product_line: { type: ["string", "null"] },
      fiber: { type: ["string", "null"] },
      weight_category: { type: ["string", "null"] },
      yardage: { type: ["number", "null"] },
      meters: { type: ["number", "null"] },
      skein_weight_grams: { type: ["number", "null"] },
      colorway: { type: ["string", "null"] },
      dye_lot: { type: ["string", "null"] },
      needle_size: { type: ["string", "null"] },
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
    ],
  },
  strict: true,
} as const;

const SYSTEM = `You extract structured yarn-label data from photos of a yarn ball band.
- Always return all fields; use null when not visible.
- weight_category MUST be one of: Lace, Fingering, Sport, DK, Worsted, Aran, Bulky.
- yardage in yards, meters in meters, skein_weight_grams in grams.
- colorway is the human name (e.g. "Aniversario"). dye_lot is the alphanumeric lot code.
- Infer reasonable values when packaging makes them obvious (e.g. metric → imperial).`;

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
  if (!process.env.OPENAI_API_KEY) {
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
    };
    return NextResponse.json({ label: mock, mocked: true });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract yarn label data from these photos." },
            ...body.images.map((url) => ({
              type: "image_url" as const,
              image_url: { url },
            })),
          ],
        },
      ],
      response_format: { type: "json_schema", json_schema: SCHEMA },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const label = JSON.parse(raw) as YarnLabel;
    return NextResponse.json({ label, mocked: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "scan failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
