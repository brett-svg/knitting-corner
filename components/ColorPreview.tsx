"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Yarn } from "@/lib/mock";

type Template = "stripes" | "yoke" | "fairisle";

export function ColorPreview({
  allocated,
  stash,
}: {
  allocated: Yarn[];
  stash: Yarn[];
}) {
  // Each "slot" starts as the allocated yarn but can be swapped to any other.
  const [slots, setSlots] = useState<Yarn[]>(() => allocated);
  const [template, setTemplate] = useState<Template>("stripes");
  const [openSlot, setOpenSlot] = useState<number | null>(null);

  const dirty = useMemo(
    () =>
      slots.length !== allocated.length ||
      slots.some((y, i) => y.id !== allocated[i]?.id),
    [slots, allocated]
  );

  function swap(idx: number, yarn: Yarn) {
    setSlots((prev) => prev.map((y, i) => (i === idx ? yarn : y)));
    setOpenSlot(null);
  }

  function addSlot(yarn: Yarn) {
    setSlots((prev) => [...prev, yarn]);
    setOpenSlot(null);
  }

  function removeSlot(idx: number) {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  if (allocated.length === 0) {
    return (
      <section className="card flex flex-col items-center gap-2 py-10 text-center">
        <div className="h-10 w-10 rounded-full bg-grad-cool opacity-70" />
        <p className="font-display text-xl">Nothing to preview yet</p>
        <p className="max-w-sm text-sm text-muted">
          Allocate at least one yarn above and we'll mock up how it'll look.
        </p>
      </section>
    );
  }

  // Available pool for swapping = stash minus what's already in slots
  const slotIds = new Set(slots.map((y) => y.id));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Color preview
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">
            How it'll <span className="italic text-grad">look together</span>
          </h2>
        </div>
        <TemplateTabs template={template} setTemplate={setTemplate} />
      </div>

      <div className="card grad-border overflow-hidden p-0">
        {template === "stripes" && <Stripes yarns={slots} />}
        {template === "yoke" && <Yoke yarns={slots} />}
        {template === "fairisle" && <FairIsle yarns={slots} />}
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted">
          Tap a swatch to try a different yarn
        </p>
        <ul className="grid gap-2 md:grid-cols-2">
          {slots.map((y, idx) => {
            const candidates = stash.filter(
              (s) => !slotIds.has(s.id) || s.id === y.id
            );
            const open = openSlot === idx;
            return (
              <li
                key={`${y.id}-${idx}`}
                className="card relative flex items-center gap-3 p-3"
              >
                <button
                  type="button"
                  onClick={() => setOpenSlot(open ? null : idx)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <Swatch yarn={y} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base">
                      {y.colorway}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {y.brand} · {y.weight}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {open ? "Close" : "Swap"}
                  </span>
                </button>
                {slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlot(idx)}
                    className="rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted hover:border-accent-rose/40 hover:text-accent-rose"
                  >
                    Remove
                  </button>
                )}

                {open && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-border bg-white p-2 shadow-soft">
                    {candidates.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-muted">
                        No other yarns in the stash to try.
                      </p>
                    ) : (
                      <ul className="grid gap-1">
                        {candidates.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => swap(idx, c)}
                              className={clsx(
                                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-tint/60",
                                c.id === y.id && "bg-tint/40"
                              )}
                            >
                              <Swatch yarn={c} size={36} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm">
                                  {c.colorway}
                                </span>
                                <span className="block truncate text-[11px] text-muted">
                                  {c.brand} · {c.weight}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <AddSlotPicker
          stash={stash.filter((s) => !slotIds.has(s.id))}
          onAdd={addSlot}
        />
      </div>

      {dirty && (
        <p className="rounded-xl border border-accent-violet/40 bg-accent-violet/10 px-3 py-2 text-xs text-ink">
          This is a what-if preview only — your actual project allocation
          hasn't changed. Swap yarns above the preview to commit them.
        </p>
      )}
    </section>
  );
}

function TemplateTabs({
  template,
  setTemplate,
}: {
  template: Template;
  setTemplate: (t: Template) => void;
}) {
  const opts: { key: Template; label: string }[] = [
    { key: "stripes", label: "Stripes" },
    { key: "yoke", label: "Yoke" },
    { key: "fairisle", label: "Fair Isle" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-white/70 p-1 text-xs backdrop-blur">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => setTemplate(o.key)}
          className={clsx(
            "rounded-full px-3 py-1.5 transition",
            template === o.key
              ? "bg-grad-signature text-white shadow-glow"
              : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Swatch({ yarn, size }: { yarn: Yarn; size: number }) {
  return (
    <span
      className="block shrink-0 rounded-full ring-2 ring-white shadow-soft"
      style={{
        width: size,
        height: size,
        background: yarn.imageUrl ? undefined : yarn.swatch,
        backgroundImage: yarn.imageUrl ? `url(${yarn.imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}

/* ─── Pattern templates ───────────────────────────────────────────── */

function Stripes({ yarns }: { yarns: Yarn[] }) {
  // Each yarn becomes a horizontal band that repeats through the canvas
  const repeats = Math.max(2, Math.ceil(12 / yarns.length));
  const bands: Yarn[] = [];
  for (let i = 0; i < repeats * yarns.length; i++) {
    bands.push(yarns[i % yarns.length]);
  }
  return (
    <div className="flex aspect-[16/9] flex-col">
      {bands.map((y, i) => (
        <div
          key={i}
          className="flex-1"
          style={{
            background: y.imageUrl ? `url(${y.imageUrl})` : y.swatch,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ))}
    </div>
  );
}

function Yoke({ yarns }: { yarns: Yarn[] }) {
  const body = yarns[0];
  const yoke = yarns[1] ?? yarns[0];
  const accent = yarns[2] ?? yoke;
  return (
    <div className="relative aspect-[16/9] overflow-hidden">
      {/* Body */}
      <div
        className="absolute inset-0"
        style={{
          background: body.imageUrl ? `url(${body.imageUrl})` : body.swatch,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Yoke */}
      <div
        className="absolute left-0 right-0 top-0 h-[34%]"
        style={{
          background: yoke.imageUrl ? `url(${yoke.imageUrl})` : yoke.swatch,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Accent ribs */}
      <div
        className="absolute left-0 right-0 top-[34%] h-[3%]"
        style={{
          background: accent.imageUrl
            ? `url(${accent.imageUrl})`
            : accent.swatch,
          backgroundSize: "cover",
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 h-[6%]"
        style={{
          background: accent.imageUrl
            ? `url(${accent.imageUrl})`
            : accent.swatch,
          backgroundSize: "cover",
        }}
      />
    </div>
  );
}

function FairIsle({ yarns }: { yarns: Yarn[] }) {
  // 5 vertical bands using rotating colors, then a contrast band
  const tiles = 24;
  const cells: Yarn[] = [];
  for (let i = 0; i < tiles; i++) cells.push(yarns[i % yarns.length]);
  return (
    <div className="aspect-[16/9] overflow-hidden">
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))`,
          gridTemplateRows: "1fr 1fr 1.4fr 1fr 1fr",
        }}
      >
        {/* Row 1: solid */}
        {cells.map((y, i) => (
          <div
            key={`r1-${i}`}
            style={{
              background: y.imageUrl ? `url(${y.imageUrl})` : y.swatch,
              backgroundSize: "cover",
            }}
          />
        ))}
        {/* Row 2: alt diamond */}
        {cells.map((_, i) => {
          const y = i % 2 === 0 ? yarns[0] : yarns[(i + 1) % yarns.length];
          return (
            <div
              key={`r2-${i}`}
              style={{
                background: y.imageUrl ? `url(${y.imageUrl})` : y.swatch,
                backgroundSize: "cover",
              }}
            />
          );
        })}
        {/* Row 3: dominant body color */}
        {cells.map((_, i) => {
          const y = yarns[0];
          return (
            <div
              key={`r3-${i}`}
              style={{
                background: y.imageUrl ? `url(${y.imageUrl})` : y.swatch,
                backgroundSize: "cover",
              }}
            />
          );
        })}
        {/* Row 4: alt diamond */}
        {cells.map((_, i) => {
          const y = i % 2 === 0 ? yarns[(i + 1) % yarns.length] : yarns[0];
          return (
            <div
              key={`r4-${i}`}
              style={{
                background: y.imageUrl ? `url(${y.imageUrl})` : y.swatch,
                backgroundSize: "cover",
              }}
            />
          );
        })}
        {/* Row 5: solid contrast */}
        {cells.map((_, i) => {
          const y = yarns[1] ?? yarns[0];
          return (
            <div
              key={`r5-${i}`}
              style={{
                background: y.imageUrl ? `url(${y.imageUrl})` : y.swatch,
                backgroundSize: "cover",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function AddSlotPicker({
  stash,
  onAdd,
}: {
  stash: Yarn[];
  onAdd: (y: Yarn) => void;
}) {
  const [open, setOpen] = useState(false);
  if (stash.length === 0) return null;
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost w-full md:w-auto"
      >
        {open ? "Close" : "+ Try another color in the mix"}
      </button>
      {open && (
        <div className="card max-h-72 overflow-y-auto p-2">
          <ul className="grid gap-1">
            {stash.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => {
                    onAdd(c);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-tint/60"
                >
                  <Swatch yarn={c} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{c.colorway}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {c.brand} · {c.weight}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
