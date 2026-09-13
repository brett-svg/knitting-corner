import { NextResponse } from "next/server";
import { decodeDataUrl, extractLabel } from "@/lib/scan-label";

export const runtime = "nodejs";
export const maxDuration = 30;

type ScanRequest = {
  // data URLs (data:image/jpeg;base64,...)
  images: string[];
};

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
  const decoded = body.images.map(decodeDataUrl).filter((x): x is NonNullable<typeof x> => !!x);
  if (!decoded.length && process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Images must be base64 data URLs" }, { status: 400 });
  }

  try {
    return NextResponse.json(await extractLabel(decoded));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "scan failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
