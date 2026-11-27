"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { Yarn, WeightCategory, StorageLocation } from "@/lib/mock";
import { YarnCard } from "@/components/YarnCard";
import { addedDays, formatDay, localAddedDay } from "@/lib/stash-select";

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

const NEW_BIN = "__new__";

export function StashClient({
  yarns,
  locations,
}: {
  yarns: Yarn[];
  locations: StorageLocation[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [weight, setWeight] = useState<WeightCategory | "All">("All");
  const [availability, setAvailability] = useState<
    "all" | "available" | "reserved"
  >("all");
  const [view, setView] = useState<View>("cards");
  const [sort, setSort] = useState<SortKey>("recent");
  const [addedDay, setAddedDay] = useState("");

  // Days are grouped in the viewer's time zone, which the server doesn't know,
  // so the "Added" options only render after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const days = useMemo(() => (mounted ? addedDays(yarns) : []), [mounted, yarns]);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTo, setMoveTo] = useState("");
  const [newBin, setNewBin] = useState("");
  const [moving, setMoving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const filtered = useMemo(() => {
    const list = yarns.filter((y) => {
      if (weight !== "All" && y.weight !== weight) return false;
      if (availability === "available" && y.reserved) return false;
      if (availability === "reserved" && !y.reserved) return false;
      if (addedDay && localAddedDay(y) !== addedDay) return false;
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
  }, [yarns, query, weight, availability, sort, addedDay]);

  const shownIds = filtered.map((y) => y.id);
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllShown() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownSelected) shownIds.forEach((id) => next.delete(id));
      else shownIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function moveSelected() {
    if (!selected.size || !moveTo) return;
    setMoving(true);
    setNotice(null);
    try {
      let locationId = moveTo;
      let locationName = locations.find((l) => l.id === moveTo)?.name ?? "";
      if (moveTo === NEW_BIN) {
        const name = newBin.trim();
        if (!name) throw new Error("Give the new bin a name");
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't create the bin");
        locationId = data.location.id;
        locationName = data.location.name;
      }
      const res = await fetch("/api/yarns/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), locationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't move the yarn");
      setNotice({
        kind: "ok",
        text: `Moved ${data.moved} ${data.moved === 1 ? "yarn" : "yarns"} to ${locationName}`,
      });
      setSelected(new Set());
      setSelecting(false);
      setMoveTo("");
      setNewBin("");
      router.refresh();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className={clsx("space-y-8", selecting && "pb-32 md:pb-28")}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Inventory
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">
            Your <span className="italic text-grad">stash</span>
          </h1>
          <p className="mt-2 text-muted">
            {filtered.length} of {yarns.length} skeins shown
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} setView={setView} />
          <button
            type="button"
            onClick={() => (selecting ? stopSelecting() : (setSelecting(true), setNotice(null)))}
            className={selecting ? "btn-grad" : "btn-ghost"}
          >
            {selecting ? "Done" : "Select"}
          </button>
          <Link href="/stash/make" className="btn-ghost">
            What can I make?
          </Link>
          <Link href="/stash/sessions" className="btn-ghost">
            Count a batch
          </Link>
          <Link href="/stash/add/scan" className="btn-grad">
            + Add yarn
          </Link>
        </div>
      </header>

      <div className="card space-y-3 p-3 md:flex md:flex-wrap md:items-center md:gap-x-6 md:gap-y-3 md:space-y-0 md:p-4">
        <div className="relative md:min-w-[16rem] md:flex-1">
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
            Added
          </span>
          <select
            value={addedDay}
            onChange={(e) => setAddedDay(e.target.value)}
            className="appearance-none rounded-full border border-border bg-white/80 px-3 py-1.5 text-xs font-medium text-ink outline-none transition focus:border-accent-lavender"
          >
            <option value="">Any day</option>
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                {formatDay(d.day)} ({d.count})
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
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

      {notice && (
        <div
          role="status"
          className={clsx(
            "card flex items-center justify-between gap-3 px-4 py-3 text-sm",
            notice.kind === "error" && "border-red-300 text-red-700"
          )}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-muted hover:text-ink">
            Dismiss
          </button>
        </div>
      )}

      {selecting && filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted">
            Tap yarn to select it
            {addedDay ? `, or select everything added ${formatDay(addedDay)}` : ""}.
          </span>
          <button
            type="button"
            onClick={selectAllShown}
            className="font-medium text-ink underline decoration-accent-lavender underline-offset-4"
          >
            {allShownSelected ? "Deselect" : "Select"} all {filtered.length} shown
          </button>
        </div>
      )}

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
            <YarnCard
              key={y.id}
              yarn={y}
              selectable={selecting}
              selected={selected.has(y.id)}
              onToggle={() => toggle(y.id)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {filtered.map((y) => (
            <PaletteTile
              key={y.id}
              yarn={y}
              selectable={selecting}
              selected={selected.has(y.id)}
              onToggle={() => toggle(y.id)}
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
              {selecting && (
                <span
                  aria-hidden
                  className={clsx(
                    "absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                    selected.has(y.id)
                      ? "border-white bg-grad-signature text-white"
                      : "border-white/90 bg-black/20 text-transparent"
                  )}
                >
                  ✓
                </span>
              )}
            </PaletteTile>
          ))}
        </div>
      )}

      {selecting && (
        <div
          // On phones it floats just above the bottom nav; on desktop it spans the bottom edge.
          className="fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),1rem)_+_4.25rem)] z-30 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-soft backdrop-blur md:inset-x-0 md:bottom-0 md:rounded-none md:border-x-0 md:border-b-0 md:px-8"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
            <p className="text-sm font-medium">
              {selected.size} selected
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="ml-3 text-xs font-normal text-muted underline underline-offset-4 hover:text-ink"
                >
                  Clear
                </button>
              )}
            </p>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <label className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-muted">Move to</span>
                <select
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                  className="rounded-full border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent-lavender"
                >
                  <option value="">Choose a bin…</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                  <option value={NEW_BIN}>+ New bin…</option>
                </select>
              </label>
              {moveTo === NEW_BIN && (
                <input
                  autoFocus
                  value={newBin}
                  onChange={(e) => setNewBin(e.target.value)}
                  placeholder="New bin name"
                  className="rounded-full border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent-lavender"
                />
              )}
              <button
                type="button"
                onClick={moveSelected}
                disabled={!selected.size || !moveTo || moving || (moveTo === NEW_BIN && !newBin.trim())}
                className="btn-grad disabled:cursor-not-allowed disabled:opacity-50"
              >
                {moving
                  ? "Moving…"
                  : selected.size
                    ? `Move ${selected.size} ${selected.size === 1 ? "yarn" : "yarns"}`
                    : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaletteTile({
  yarn,
  selectable,
  selected,
  onToggle,
  children,
}: {
  yarn: Yarn;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const className = clsx(
    "group relative block aspect-square overflow-hidden rounded-2xl ring-1 ring-border transition hover:scale-[1.04] hover:ring-2 hover:ring-accent-lavender",
    selected && "ring-2 ring-accent-lavender"
  );
  const style = !yarn.imageUrl ? { background: yarn.swatch } : undefined;
  const title = `${yarn.brand} · ${yarn.colorway}`;
  if (selectable) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        title={title}
        className={className}
        style={style}
      >
        {children}
      </button>
    );
  }
  return (
    <Link href={`/stash/${yarn.id}`} title={title} className={className} style={style}>
      {children}
    </Link>
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
