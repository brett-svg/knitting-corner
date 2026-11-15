"use client";

// Whole-stash "What can I make?" (/stash/make). Group the stash by weight,
// pick a group (or tick specific yarns), and see patterns for the combined
// yardage, so several skeins together can qualify for a bigger project.

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Pattern, WeightCategory, Yarn } from "@/lib/mock";
import { PATTERN_TYPES, libraryMatches } from "@/lib/suggestions";
import { PatternCard } from "@/components/PatternCard";
import { RavelrySuggestions } from "@/components/RavelrySuggestions";

const WEIGHTS: WeightCategory[] = ["Lace", "Fingering", "Sport", "DK", "Worsted", "Aran", "Bulky"];

const yardsOf = (y: Yarn) => (y.yardage || 0) * (y.skeins || 0);
const fmt = (n: number) => n.toLocaleString("en-US");
// Reserved yarn is promised to a project, so it starts unticked.
const defaultTicked = (ys: Yarn[]) => new Set(ys.filter((y) => !y.reserved).map((y) => y.id));

export function StashMakeClient({
  yarns,
  patterns,
  ravelryEnabled,
}: {
  yarns: Yarn[];
  patterns: Pattern[];
  ravelryEnabled: boolean;
}) {
  const groups = useMemo(
    () =>
      WEIGHTS.map((weight) => {
        const ys = yarns.filter((y) => y.weight === weight);
        return { weight, yarns: ys, yards: ys.reduce((n, y) => n + yardsOf(y), 0) };
      }).filter((g) => g.yarns.length > 0),
    [yarns]
  );

  // Start on the weight with the most yarn.
  const [weight, setWeight] = useState<WeightCategory | null>(
    () => [...groups].sort((a, b) => b.yards - a.yards)[0]?.weight ?? null
  );
  const group = groups.find((g) => g.weight === weight) ?? null;
  const [ticked, setTicked] = useState<Set<string>>(() => defaultTicked(group?.yarns ?? []));
  const [craft, setCraft] = useState<"knitting" | "crochet">("knitting");
  const [type, setType] = useState("");

  function pickGroup(w: WeightCategory) {
    setWeight(w);
    setTicked(defaultTicked(groups.find((g) => g.weight === w)?.yarns ?? []));
  }
  function toggle(id: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const chosen = group?.yarns.filter((y) => ticked.has(y.id)) ?? [];
  const total = chosen.reduce((n, y) => n + yardsOf(y), 0);
  const library = group && total > 0 ? libraryMatches(patterns, group.weight, total) : [];
  const ids = chosen.map((y) => y.id).join(",");
  const params = useMemo(
    () => ({ yarns: ids, craft, ...(type ? { type } : {}) }),
    [ids, craft, type]
  );

  return (
    <div className="space-y-8">
      <header>
        <Link href="/stash" className="text-xs text-muted hover:text-ink">
          ← Stash
        </Link>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">Whole stash</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">
          What can I <span className="italic text-grad">make?</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Pick a weight, then tick the yarns you&apos;d use together. Suggestions use their
          combined yardage.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-grad-cool opacity-70" />
          <p className="font-display text-2xl">Your stash is empty</p>
          <p className="max-w-sm text-sm text-muted">Add some yarn and we&apos;ll suggest what it could become.</p>
          <Link href="/stash/add/scan" className="btn-grad mt-2">
            + Add yarn
          </Link>
        </div>
      ) : (
        <>
          <div className="-mx-2 -my-2 flex gap-3 overflow-x-auto px-2 py-2">
            {groups.map((g) => (
              <button
                key={g.weight}
                type="button"
                onClick={() => pickGroup(g.weight)}
                aria-pressed={g.weight === weight}
                className={clsx(
                  "card min-w-[9.5rem] shrink-0 p-4 text-left transition",
                  g.weight === weight
                    ? "grad-border shadow-glow"
                    : "hover:-translate-y-0.5 hover:shadow-glow"
                )}
              >
                <span className="block font-display text-2xl">{g.weight}</span>
                <span className="mt-1 block text-sm text-ink">{fmt(g.yards)} yd</span>
                <span className="block text-xs text-muted">
                  across {g.yarns.length} yarn{g.yarns.length === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </div>

          {group && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,5fr)]">
              <aside className="card h-fit p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    {group.weight} yarns
                  </p>
                  <div className="flex gap-3 text-xs">
                    <button type="button" className="text-muted hover:text-ink" onClick={() => setTicked(new Set(group.yarns.map((y) => y.id)))}>
                      All
                    </button>
                    <button type="button" className="text-muted hover:text-ink" onClick={() => setTicked(new Set())}>
                      None
                    </button>
                  </div>
                </div>
                <ul className="mt-3 space-y-1">
                  {group.yarns.map((y) => (
                    <li key={y.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-tint">
                        <input
                          type="checkbox"
                          checked={ticked.has(y.id)}
                          onChange={() => toggle(y.id)}
                          className="h-4 w-4 shrink-0 accent-[#C084FC]"
                        />
                        <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: y.swatch }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {y.brand} {y.productLine}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {y.colorway} · {y.skeins} × {fmt(y.yardage)} yd
                            {y.reserved ? " · Reserved" : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted">{fmt(yardsOf(y))}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted">
                    {chosen.length} of {group.yarns.length} ticked
                  </span>
                  <span className="font-display text-xl">{fmt(total)} yd</span>
                </div>
              </aside>

              <section className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 rounded-full border border-border bg-white/70 p-1 text-xs backdrop-blur">
                    {(["knitting", "crochet"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCraft(c)}
                        aria-pressed={craft === c}
                        className={clsx(
                          "rounded-full px-3 py-1.5 capitalize transition",
                          craft === c ? "bg-grad-signature text-white" : "text-muted"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted">Type</span>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="appearance-none rounded-full border border-border bg-white/80 px-3 py-1.5 text-xs font-medium text-ink outline-none transition focus:border-accent-lavender"
                    >
                      <option value="">Anything</option>
                      {PATTERN_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {total === 0 ? (
                  <div className="card mt-6 flex flex-col items-center gap-2 py-12 text-center">
                    <div className="h-10 w-10 rounded-full bg-grad-warm opacity-70" />
                    <p className="max-w-sm text-sm text-muted">Tick at least one yarn to see what it could become.</p>
                  </div>
                ) : (
                  <>
                    <h2 className="mt-6 font-display text-3xl tracking-tight">
                      {fmt(total)} yd of {group.weight}{" "}
                      <span className="italic text-grad">could become…</span>
                    </h2>

                    <h3 className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                      From your library
                    </h3>
                    {library.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                        {library.slice(0, 6).map((p) => (
                          <PatternCard key={p.id} pattern={p} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted">
                        No saved {group.weight} patterns fit {fmt(total)} yd yet.
                      </p>
                    )}

                    {ravelryEnabled && (
                      <RavelrySuggestions
                        endpoint="/api/suggestions"
                        params={params}
                        fallbackWeight={group.weight}
                        scope={chosen.length === 1 ? "this yarn" : "these yarns"}
                        narrow
                      />
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
