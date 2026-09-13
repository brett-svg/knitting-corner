import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getObjectStream, hasStorage, ownsKey } from "@/lib/storage";

export const runtime = "nodejs";

// Streams a private bucket object to its owner.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  if (!hasStorage()) return new NextResponse("Storage not configured", { status: 404 });
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const key = (await params).key.join("/");
  if (!ownsKey(key, user.id)) return new NextResponse("Not found", { status: 404 });

  try {
    const obj = await getObjectStream(key);
    if (!obj.Body) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(obj.Body.transformToWebStream(), {
      headers: {
        "content-type": obj.ContentType ?? "application/octet-stream",
        ...(obj.ContentLength ? { "content-length": String(obj.ContentLength) } : {}),
        // Keys are immutable UUIDs, so the browser can cache aggressively.
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey")
      return new NextResponse("Not found", { status: 404 });
    throw err;
  }
}
