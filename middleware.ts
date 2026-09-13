import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth-edge";

const PUBLIC_PATHS = [/^\/login/, /^\/api\/auth\//];

export async function middleware(request: NextRequest) {
  // No database configured? Run in demo mode — let everything through.
  if (!process.env.DATABASE_URL) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifySession(token) : null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((re) => re.test(path));

  if (!user && !isPublic) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
