"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Yarn, WeightCategory } from "@/lib/mock";
import { YarnCard } from "@/components/YarnCard";

const weights: WeightCategory[] = [
  "Lace",
  "Fingering",
  "Sport",
  "DK",
  "Worsted",
  "Aran",
  "Bulky",
];

type View = "cards" | "palette";
type SortKey = "recent" | "weight" | "brand" | "colorway" | "yardage";

const WEIGHT_ORDER: Record<WeightCategory, number> = {
  Lace: 0,
  Fingering: 1,
  Sport: 2,
  DK: 3,
  Worsted: 4,
  Aran: 5,
  Bulky: 6,
};

export function StashClient({ yarns }: { yarns: Yarn[] }) {
  const [query, setQuery] = useState("");
  const [weight, setWeight] = useState<WeightCategory | "All">("All");
  const [availability, setAvailability] = useState<
    "all" | "available" | "reserved"
  >("all");
  const [view, setView] = useState<View>("cards");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const list = yarns.filter((y) => {
      if (weight !== "All" && y.weight !== weight) return false;
      if (availability === "available" && y.reserved) return false;
      if (availability === "reserved" && !y.reserved) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay =
          `${y.brand} ${y.productLine} ${y.colorway} ${y.fiber}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list];
    switch (sort) {
      case "weight":
        sorted.sort(
          (a, b) =>
            (WEIGHT_ORDER[a.weight] ?? 99) - (WEIGHT_ORDER[b.weight] ?? 99) ||
            a.brand.localeCompare(b.brand)
        );
        break;
      case "brand":
        sorted.sort(
          (a, b) =>
            a.brand.localeCompare(b.brand) ||
            a.colorway.localeCompare(b.colorway)
        );
        break;
      case "colorway":
        sorted.sort((a, b) => a.colorway.localeCompare(b.colorway));
        break;
      case "yardage":
        sorted.sort(
          (a, b) => b.yardage * b.skeins - a.yardage * a.skeins
        );
        break;
      default:
        sorted.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
    }
    return sorted;
  }, [yarns, query, weight, availability, sort]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Inventory
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">
            Your <span className="italic text-grad">stash</span>
          </h1>
          <p className="mt-2 text-muted">
            {filtered.length} of {yarns.length} skeins shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} setView={setView} />
          <Link href="/stash/add/scan" className="btn-grad">
            + Add yarn
          </Link>
        </div>
      </header>

      <div className="card space-y-3 p-3 md:flex md:items-center md:gap-6 md:space-y-0 md:p-4">
        <div className="relative md:flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brand, colorway, fiber…"
            className="w-full rounded-full border border-border bg-tint/60 px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent-lavender focus:bg-white md:px-5"
          />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible md:pb-0">
          <Pill
            active={weight === "All"}
            onClick={() => setWeight("All")}
            label="All"
          />
          {weights.map((w) => (
            <Pill
              key={w}
              active={weight === w}
              onClick={() => setWeight(w)}
              label={w}
            />
          ))}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 md:overflow-visible">
          <Pill
            active={availability === "all"}
            onClick={() => setAvailability("all")}
            label="Any"
          />
          <Pill
            active={availability === "available"}
            onClick={() => setAvailability("available")}
            label="Available"
          />
          <Pill
            active={availability === "reserved"}
            onClick={() => setAvailability("reserved")}
            label="Reserved"
          />
        </div>

        <label className="flex items-center gap-2 md:ml-auto">
          <span className="text-[11px] uppercase tracking-wider text-muted">
            Sort
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none rounded-full border border-border bg-white/80 px-3 py-1.5 text-xs font-medium text-ink outline-none transition focus:border-accent-lavender"
          >
            <option value="recent">Recently added</option>
            <option value="weight">Weight (Lace → Bulky)</option>
            <option value="brand">Brand</option>
            <option value="colorway">Colorway</option>
            <option value="yardage">Total yardage</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-grad-cool opacity-70" />
          <p className="font-display text-2xl">Nothing matches that yet</p>
          <p className="max-w-sm text-sm text-muted">
            Try a different filter, or scan a new skein to grow your stash.
          </p>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((y) => (
            <YarnCard key={y.id} yarn={y} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {filtered.map((y) => (
            <Link
              key={y.id}
              href={`/stash/${y.id}`}
              title={`${y.brand} · ${y.colorway}`}
              className="group relative aspect-square overflow-hidden rounded-2xl ring-1 ring-border transition hover:scale-[1.04] hover:ring-2 hover:ring-accent-lavender"
              style={!y.imageUrl ? { background: y.swatch } : undefined}
            >
              {y.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={y.imageUrl}
                  alt={y.colorway}
                  className="h-full w-full object-cover"
                />
              )}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-transparent opacity-0 transition group-hover:opacity-100" />
              <span className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 truncate text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                {y.colorway}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewToggle({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-white/70 p-1 text-xs backdrop-blur">
      <button
        onClick={() => setView("cards")}
        className={clsx(
          "rounded-full px-3 py-1.5 transition",
          view === "cards" ? "bg-grad-signature text-white" : "text-muted"
        )}
      >
        Cards
      </button>
      <button
        onClick={() => setView("palette")}
        className={clsx(
          "rounded-full px-3 py-1.5 transition",
          view === "palette" ? "bg-grad-signature text-white" : "text-muted"
        )}
      >
        Palette
      </button>
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
