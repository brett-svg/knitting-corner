import { NextResponse } from "next/server";
import { changePassword, setSessionCookie } from "@/lib/auth";
import { requireUser } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { user, fail } = await requireUser();
  if (fail) return fail;
  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: "Current and new password required" }, { status: 400 });
  try {
    const updated = await changePassword(user, String(currentPassword), String(newPassword));
    // Re-issue the cookie so the token no longer carries the change-required flag.
    await setSessionCookie(updated);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Password change failed" },
      { status: 400 }
    );
  }
}
