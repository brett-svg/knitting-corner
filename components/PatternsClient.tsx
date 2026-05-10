"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Pattern, WeightCategory } from "@/lib/mock";
import { PatternCard } from "@/components/PatternCard";

const WEIGHTS: WeightCategory[] = [
  "Lace",
  "Fingering",
  "Sport",
  "DK",
  "Worsted",
  "Aran",
  "Bulky",
];

export function PatternsClient({ patterns }: { patterns: Pattern[] }) {
  const [query, setQuery] = useState("");
  const [weight, setWeight] = useState<WeightCategory | "All">("All");

  const filtered = useMemo(() => {
    return patterns.filter((p) => {
      if (weight !== "All" && p.yarnWeight !== weight) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${p.name} ${p.designer ?? ""} ${p.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [patterns, query, weight]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Library
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">
            Your <span className="italic text-grad">patterns</span>
          </h1>
          <p className="mt-2 text-muted">
            {filtered.length} of {patterns.length} shown · upload PDFs or save
            links, then match them with your stash.
          </p>
        </div>
        <Link href="/patterns/new" className="btn-grad">
          + Add pattern
        </Link>
      </header>

      {patterns.length > 0 && (
        <div className="card space-y-3 p-3 md:flex md:items-center md:gap-6 md:space-y-0 md:p-4">
          <div className="relative md:flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, designer, notes…"
              className="w-full rounded-full border border-border bg-tint/60 px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent-lavender focus:bg-white md:px-5"
            />
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible md:pb-0">
            <Pill
              active={weight === "All"}
              onClick={() => setWeight("All")}
              label="All"
            />
            {WEIGHTS.map((w) => (
              <Pill
                key={w}
                active={weight === w}
                onClick={() => setWeight(w)}
                label={w}
              />
            ))}
          </div>
        </div>
      )}

      {patterns.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-grad-warm" />
          <p className="font-display text-2xl">No patterns yet</p>
          <p className="max-w-sm text-sm text-muted">
            Drop a PDF here or paste a link to start your library.
          </p>
          <Link href="/patterns/new" className="btn-grad mt-2">
            Add your first pattern
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-12 text-center">
          <div className="h-10 w-10 rounded-full bg-grad-cool opacity-70" />
          <p className="font-display text-xl">Nothing matches that</p>
          <p className="max-w-sm text-sm text-muted">
            Try a different search or weight.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <PatternCard key={p.id} pattern={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition",
        active
          ? "bg-grad-signature text-white shadow-glow"
          : "border border-border bg-white/70 text-muted hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}
