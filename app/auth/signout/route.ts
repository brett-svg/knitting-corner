import { type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(_request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return new Response(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}
