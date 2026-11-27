// Helpers for picking yarns on the stash page by the day they were added.
// Days are the viewer's local calendar day: a batch counted on the evening of
// Nov 26 in the US lands on Nov 27 in UTC, and should still read as Nov 26.

import type { Yarn } from "@/lib/mock";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local YYYY-MM-DD for when the yarn was added. */
export function localAddedDay(y: Pick<Yarn, "addedAt" | "addedAtIso">): string {
  // Mock data only has a date; treat it as local noon so it never shifts a day.
  const d = new Date(y.addedAtIso ?? `${y.addedAt}T12:00:00`);
  if (Number.isNaN(d.getTime())) return y.addedAt;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Distinct local days yarn was added, newest first, with how many entries each. */
export function addedDays(
  yarns: Array<Pick<Yarn, "addedAt" | "addedAtIso">>
): Array<{ day: string; count: number }> {
  const counts = new Map<string, number>();
  for (const y of yarns) {
    const day = localAddedDay(y);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from(counts, ([day, count]) => ({ day, count })).sort((a, b) =>
    a.day < b.day ? 1 : a.day > b.day ? -1 : 0
  );
}

/** "Thu, Nov 26, 2026" for a local YYYY-MM-DD. */
export function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
