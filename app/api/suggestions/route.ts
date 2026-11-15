// GET /api/suggestions?yarns=<id>,<id>&free=1&craft=knitting|crochet|any&type=<category>
// Ravelry patterns for several stash yarns of one weight, using their
// combined yardage. Backs /stash/make.

import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { getPatterns, getYarns } from "@/lib/data";
import {
  parseCraft,
  ravelrySuggestionsEnabled,
  suggestForYarns,
} from "@/lib/pattern-suggestions";
import { PATTERN_TYPES } from "@/lib/suggestions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (hasDb()) {
    const { fail } = await requireUser();
    if (fail) return fail;
  }
  if (!ravelrySuggestionsEnabled()) {
    return NextResponse.json({ enabled: false, suggestions: [] });
  }

  const url = new URL(req.url);
  const ids = new Set((url.searchParams.get("yarns") ?? "").split(",").filter(Boolean));
  const yarns = (await getYarns()).filter((y) => ids.has(y.id));
  if (!yarns.length) {
    return NextResponse.json({ error: "Pick at least one yarn" }, { status: 400 });
  }
  if (new Set(yarns.map((y) => y.weight)).size > 1) {
    return NextResponse.json({ error: "Pick yarns of one weight" }, { status: 400 });
  }
  const type = url.searchParams.get("type");

  try {
    const library = await getPatterns();
    const result = await suggestForYarns(yarns, library, {
      free: url.searchParams.get("free") === "1",
      craft: parseCraft(url.searchParams.get("craft")),
      category: PATTERN_TYPES.some((t) => t.value === type) ? type : null,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[suggestions]", err);
    return NextResponse.json({ error: "Couldn't reach Ravelry. Try again in a bit." }, { status: 502 });
  }
}
