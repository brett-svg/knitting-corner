import { type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: `/login?error=${encodeURIComponent(error.message)}`,
        },
      });
    }
  }
  return new Response(null, {
    status: 303,
    headers: { Location: next.startsWith("/") ? next : "/" },
  });
}
