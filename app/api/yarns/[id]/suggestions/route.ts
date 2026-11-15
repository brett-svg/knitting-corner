// GET /api/yarns/:id/suggestions?free=1&craft=knitting|crochet|any
// Ravelry patterns this yarn could become. See lib/pattern-suggestions.ts.

import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { notFound, requireUser } from "@/lib/api";
import { getPatterns, getYarn } from "@/lib/data";
import {
  parseCraft,
  ravelrySuggestionsEnabled,
  suggestForYarns,
} from "@/lib/pattern-suggestions";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (hasDb()) {
    const { fail } = await requireUser();
    if (fail) return fail;
  }
  if (!ravelrySuggestionsEnabled()) {
    return NextResponse.json({ enabled: false, suggestions: [] });
  }
  const { id } = await params;
  const yarn = await getYarn(id);
  if (!yarn) return notFound();

  const url = new URL(req.url);
  try {
    const library = await getPatterns();
    const result = await suggestForYarns([yarn], library, {
      free: url.searchParams.get("free") === "1",
      craft: parseCraft(url.searchParams.get("craft")),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[suggestions]", err);
    return NextResponse.json({ error: "Couldn't reach Ravelry. Try again in a bit." }, { status: 502 });
  }
}
