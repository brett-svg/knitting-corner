// Email + password auth with a signed, httpOnly session cookie.
// Passwords: Node's built-in scrypt. Sessions: HS256 JWT via jose.
// Server-only — middleware uses lib/auth-edge.ts instead.

import { cookies } from "next/headers";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db, hasDb, schema } from "@/lib/db";
import { COOKIE_NAME, signSession, verifySession, type SessionUser } from "@/lib/auth-edge";

const scrypt = promisify(scryptCb);
const SESSION_DAYS = 30;

export type { SessionUser };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hex] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hex) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Optional comma-separated allowlist. Unset = anyone can create an account.
export function emailAllowed(email: string): boolean {
  const list = process.env.ALLOWED_EMAILS;
  if (!list) return true;
  const allowed = list.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user, SESSION_DAYS);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

// Who is signed in, per the cookie. Null in demo mode (no DATABASE_URL).
export async function getUser(): Promise<SessionUser | null> {
  if (!hasDb()) return null;
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function signUp(email: string, password: string): Promise<SessionUser> {
  const normalized = email.trim().toLowerCase();
  if (!emailAllowed(normalized)) throw new Error("That email isn't on the allowlist.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const existing = await db().query.users.findFirst({ where: eq(schema.users.email, normalized) });
  if (existing) throw new Error("An account with that email already exists.");
  const [row] = await db()
    .insert(schema.users)
    .values({ email: normalized, passwordHash: await hashPassword(password) })
    .returning({ id: schema.users.id, email: schema.users.email });
  return row;
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const normalized = email.trim().toLowerCase();
  const row = await db().query.users.findFirst({ where: eq(schema.users.email, normalized) });
  // Same error either way so the form doesn't leak which emails exist.
  if (!row || !(await verifyPassword(password, row.passwordHash)))
    throw new Error("Email or password is incorrect.");
  return { id: row.id, email: row.email };
}
