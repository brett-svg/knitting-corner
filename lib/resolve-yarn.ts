// Canonicalize an AI-extracted label against Ravelry's yarn database.
//
// The model is good at reading the brand and line off a ball band and bad at
// the small print (yardage, grams, fiber percentages). Ravelry has the small
// print. So: search Ravelry with what the model read, pick the matching yarn,
// and let Ravelry's numbers win for the fields it knows.

import type Anthropic from "@anthropic-ai/sdk";
import { hasRavelry, searchYarns } from "@/lib/ravelry";
import {
  applyRavelry,
  type RavelryMatch,
  type RavelryYarn,
  type YarnLabel,
} from "@/lib/yarn-label";

export type { RavelryMatch, RavelryYarn, YarnLabel };

export type ResolvedLabel = { label: YarnLabel; ravelry: RavelryMatch };

const NONE: RavelryMatch = { yarn: null, matchedBy: "none", candidates: [], overrides: [] };

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[®™©.,'"`!?()\-]/g, " ")
    .replace(/\b(yarn(s)?|co|company|ltd|inc|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string | null | undefined): Set<string> {
  return new Set(norm(s).split(" ").filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function near(a: number | null, b: number | null, tol: number): boolean {
  if (a == null || b == null) return false;
  return Math.abs(a - b) / Math.max(a, b) <= tol;
}

// 0..1-ish. Name overlap dominates; label numbers act as tiebreakers.
function score(label: YarnLabel, y: RavelryYarn): number {
  const want = tokens(`${label.brand} ${label.product_line}`);
  const have = tokens(`${y.company} ${y.name}`);
  let s = jaccard(want, have);

  const lineWant = norm(label.product_line);
  const lineHave = norm(y.name);
  // Exact line name beats a variant ("Wool Ease Thick & Quick (Tweeds)").
  if (lineWant && lineHave) {
    if (lineWant === lineHave) s += 0.4;
    else if (lineHave.includes(lineWant)) s += 0.15;
  }
  const brandWant = norm(label.brand);
  const brandHave = norm(y.company);
  if (brandWant && brandHave && (brandHave.includes(brandWant) || brandWant.includes(brandHave)))
    s += 0.15;

  if (label.weight_category && y.weight && label.weight_category === y.weight) s += 0.1;
  if (near(label.yardage, y.yardage, 0.08)) s += 0.1;
  if (near(label.skein_weight_grams, y.grams, 0.05)) s += 0.05;
  if (y.discontinued) s -= 0.05;
  return s;
}

async function askModelToPick(
  anthropic: Anthropic,
  model: string,
  label: YarnLabel,
  candidates: RavelryYarn[]
): Promise<RavelryYarn | null> {
  const list = candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.company} — ${c.name} (${c.weightName ?? "?"}, ${c.yardage ?? "?"} yd / ${c.grams ?? "?"} g, ${c.fiber ?? "fiber ?"})`
    )
    .join("\n");
  const read = `brand: ${label.brand ?? "?"}, line: ${label.product_line ?? "?"}, weight: ${label.weight_category ?? "?"}, yardage: ${label.yardage ?? "?"}, grams: ${label.skein_weight_grams ?? "?"}, fiber: ${label.fiber ?? "?"}`;

  const msg = await anthropic.messages.create({
    model,
    max_tokens: 64,
    system:
      "You match a yarn label to a database entry. Reply with only the number of the best match, or 0 if none of the candidates is clearly the same yarn.",
    messages: [
      {
        role: "user",
        content: `Label as read from the ball band:\n${read}\n\nCandidates:\n${list}\n\nWhich number?`,
      },
    ],
  });
  const text = msg.content.find((b) => b.type === "text");
  const n = text && text.type === "text" ? parseInt(text.text.trim(), 10) : NaN;
  if (!Number.isFinite(n) || n < 1 || n > candidates.length) return null;
  return candidates[n - 1];
}

export async function resolveWithRavelry(
  label: YarnLabel,
  opts: { anthropic?: Anthropic; model?: string } = {}
): Promise<ResolvedLabel> {
  if (!hasRavelry() || !label.brand) return { label, ravelry: NONE };

  // Try the most specific query first, then fall back.
  const queries = [
    label.product_line ? `${label.brand} ${label.product_line}` : null,
    label.product_line,
    label.brand,
  ].filter((q): q is string => Boolean(q && q.trim()));

  let candidates: RavelryYarn[] = [];
  try {
    for (const q of queries) {
      candidates = await searchYarns(q, 6);
      if (candidates.length) break;
    }
  } catch (err) {
    console.error("[ravelry] lookup failed:", err instanceof Error ? err.message : err);
    return { label, ravelry: NONE };
  }
  if (!candidates.length) return { label, ravelry: NONE };

  const ranked = candidates
    .map((y) => ({ y, s: score(label, y) }))
    .sort((a, b) => b.s - a.s);
  const [best, second] = ranked;
  const gap = best.s - (second?.s ?? 0);

  let pick: RavelryYarn | null = null;
  let matchedBy: RavelryMatch["matchedBy"] = "none";

  if (best.s >= 0.6 && gap >= 0.15) {
    pick = best.y;
    matchedBy = "auto";
  } else if (best.s >= 0.25 && opts.anthropic) {
    try {
      pick = await askModelToPick(
        opts.anthropic,
        opts.model ?? "claude-haiku-4-5",
        label,
        ranked.slice(0, 5).map((r) => r.y)
      );
      if (pick) matchedBy = "ai";
    } catch (err) {
      console.error("[ravelry] disambiguation failed:", err instanceof Error ? err.message : err);
    }
  }

  const orderedCandidates = ranked.map((r) => r.y);
  if (!pick) {
    return { label, ravelry: { yarn: null, matchedBy: "none", candidates: orderedCandidates, overrides: [] } };
  }
  const applied = applyRavelry(label, pick);
  return {
    label: applied.label,
    ravelry: { yarn: pick, matchedBy, candidates: orderedCandidates, overrides: applied.overrides },
  };
}
