import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { fileUrl } from "@/lib/storage";

export const runtime = "nodejs";

// Kept for existing links: redirects to the owner-gated file route.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;

  const pattern = await db().query.patterns.findFirst({
    columns: { pdfKey: true },
    where: and(eq(schema.patterns.id, id), eq(schema.patterns.userId, user.id)),
  });
  const url = fileUrl(pattern?.pdfKey);
  if (!url) return NextResponse.json({ error: "no PDF" }, { status: 404 });
  return NextResponse.redirect(new URL(url, _req.url));
}
