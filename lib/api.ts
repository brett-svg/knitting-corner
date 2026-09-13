// Shared bits for route handlers.

import { NextResponse } from "next/server";
import { getUser, type SessionUser } from "@/lib/auth";
import { hasDb } from "@/lib/db";

export const notConfigured = () =>
  NextResponse.json({ error: "Database not configured" }, { status: 400 });

export const unauthorized = () =>
  NextResponse.json({ error: "Not signed in" }, { status: 401 });

export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export const serverError = (err: unknown) =>
  NextResponse.json(
    { error: err instanceof Error ? err.message : "Something went wrong" },
    { status: 500 }
  );

// Returns the user, or the response to send instead.
export async function requireUser(): Promise<
  { user: SessionUser; fail: null } | { user: null; fail: NextResponse }
> {
  if (!hasDb()) return { user: null, fail: notConfigured() };
  const user = await getUser();
  if (!user) return { user: null, fail: unauthorized() };
  return { user, fail: null };
}

export function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
