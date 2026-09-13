import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/api";
import { commitSession } from "@/lib/sessions";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { id } = await params;
  try {
    const result = await commitSession(user.id, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return serverError(err);
  }
}
