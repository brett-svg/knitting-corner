// The subset of auth that runs in middleware (edge runtime): JWT sign/verify.

import { jwtVerify, SignJWT } from "jose";

export const COOKIE_NAME = "kc_session";

export type SessionUser = { id: string; email: string };

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ random chars)");
  return new TextEncoder().encode(s);
}

export async function signSession(user: SessionUser, days: number): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
