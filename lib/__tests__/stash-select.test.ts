import { describe, expect, it } from "vitest";
import { addedDays, localAddedDay } from "@/lib/stash-select";

// Expectations are built from local Date parts so the test passes in any TZ.
function localDay(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

describe("localAddedDay", () => {
  it("uses the viewer's local day from the full timestamp", () => {
    const iso = "2026-11-27T03:30:00.000Z";
    expect(localAddedDay({ addedAt: "2026-11-27", addedAtIso: iso })).toBe(localDay(iso));
  });

  it("falls back to the plain date without shifting it", () => {
    expect(localAddedDay({ addedAt: "2026-04-25" })).toBe("2026-04-25");
  });
});

describe("addedDays", () => {
  it("groups by day, newest first, with counts", () => {
    const days = addedDays([
      { addedAt: "2026-04-25" },
      { addedAt: "2026-11-26" },
      { addedAt: "2026-04-25" },
      { addedAt: "2026-11-26" },
      { addedAt: "2026-11-26" },
    ]);
    expect(days).toEqual([
      { day: "2026-11-26", count: 3 },
      { day: "2026-04-25", count: 2 },
    ]);
  });
});
