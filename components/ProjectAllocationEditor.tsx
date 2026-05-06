"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import type { Project, Yarn } from "@/lib/mock";

export function ProjectAllocationEditor({
  project,
  allYarns,
  patternWeight,
  requiredYardage,
}: {
  project: Project;
  allYarns: Yarn[];
  patternWeight: string | null;
  requiredYardage?: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const linkedIds = new Set(project.yarnIds);
  const linked = allYarns.filter((y) => linkedIds.has(y.id));
  const candidates = useMemo(() => {
    return allYarns.filter((y) => {
      if (linkedIds.has(y.id)) return false;
      if (patternWeight && y.weight !== patternWeight) return false;
      return true;
    });
  }, [allYarns, linkedIds, patternWeight]);

  async function add(yarnId: string) {
    setError(null);
    const res = await fetch(`/api/projects/${project.id}/yarns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ yarnId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Add failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function remove(yarnId: string) {
    setError(null);
    const res = await fetch(
      `/api/projects/${project.id}/yarns?yarnId=${encodeURIComponent(yarnId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Remove failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  const allocatedYards = linked.reduce(
    (n, y) => n + y.yardage * y.skeins,
    0
  );
  const needed = requiredYardage ?? 0;
  const safetyBuffer = needed * 1.1;
  const enough = needed === 0 || allocatedYards >= safetyBuffer;
  const tight = needed > 0 && allocatedYards >= needed && allocatedYards < safetyBuffer;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Yarn allocated
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">
            {linked.length} skein{linked.length === 1 ? "" : "s"}{" "}
            <span className="text-base font-normal text-muted">
              · {allocatedYards.toLocaleString()} yds
              {needed > 0 && (
                <> / {needed.toLocaleString()} needed</>
              )}
            </span>
          </h2>
        </div>
        <button
          onClick={() => setPicking((v) => !v)}
          className={picking ? "btn-ghost" : "btn-grad"}
          disabled={candidates.length === 0 && !picking}
        >
          {picking
            ? "Done"
            : candidates.length === 0
              ? "Nothing left to add"
              : "+ Add yarn"}
        </button>
      </div>

      {needed > 0 && !enough && (
        <div
          className={clsx(
            "rounded-xl border px-4 py-3 text-sm",
            tight
              ? "border-accent-peach/60 bg-accent-peach/15 text-ink"
              : "border-accent-rose/50 bg-accent-rose/10 text-accent-rose"
          )}
        >
          {tight ? (
            <>
              <strong>Tight fit.</strong> You have just enough, but no safety
              buffer. Patterns often use {Math.round((safetyBuffer - allocatedYards))}{" "}
              extra yds for swatching, frogging, or larger sizes.
            </>
          ) : (
            <>
              <strong>Not enough yarn yet.</strong> You're{" "}
              {(needed - allocatedYards).toLocaleString()} yds short of the
              pattern's requirement.
            </>
          )}
        </div>
      )}

      {linked.length === 0 ? (
        <div className="card px-4 py-8 text-center text-sm text-muted">
          No yarn assigned yet — pick from your stash below.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {linked.map((y) => (
            <li key={y.id} className="card flex items-center gap-3 p-3">
              <span
                className="h-12 w-12 shrink-0 rounded-full ring-2 ring-white"
                style={{ background: y.swatch }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base">{y.colorway}</p>
                <p className="truncate text-xs text-muted">
                  {y.brand} · {y.weight} ·{" "}
                  {(y.yardage * y.skeins).toLocaleString()} yds
                </p>
              </div>
              <button
                onClick={() => remove(y.id)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-accent-rose/40 hover:text-accent-rose"
                aria-label={`Remove ${y.colorway}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {picking && (
        <div className="card grad-border space-y-3 p-4">
          <p className="text-xs uppercase tracking-wider text-muted">
            Pick from stash
            {patternWeight ? (
              <>
                {" · "}
                <span className="text-ink">{patternWeight}</span> only
              </>
            ) : null}
          </p>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted">
              No matching yarn left in your stash.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {candidates.map((y) => (
                <button
                  type="button"
                  key={y.id}
                  onClick={() => add(y.id)}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl border border-border bg-white p-3 text-left transition hover:border-accent-lavender hover:bg-tint/40"
                  )}
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-full ring-2 ring-white/70"
                    style={{ background: y.swatch }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base">
                      {y.colorway}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {y.brand} · {y.weight} · {y.yardage * y.skeins} yds
                    </span>
                  </span>
                  <span className="text-xs font-medium text-accent-lavender">
                    Add
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
          {error}
        </p>
      )}
      {isPending && (
        <p className="text-xs text-muted">Updating…</p>
      )}
    </section>
  );
}
