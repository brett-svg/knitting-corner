import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { setSessionCookie, signIn } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Database not configured" }, { status: 400 });
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  try {
    const user = await signIn(String(email), String(password));
    await setSessionCookie(user);
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sign in failed" },
      { status: 401 }
    );
  }
}
