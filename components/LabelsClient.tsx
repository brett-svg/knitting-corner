"use client";

import { useState } from "react";
import type { LocationWithYarns } from "@/lib/data";

export function LabelsClient({ locations }: { locations: LocationWithYarns[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(locations.map((l) => l.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function print() {
    if (!selected.size) return;
    setLoading(true);
    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Failed to generate labels");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  if (!locations.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-lg text-muted">No storage locations yet.</p>
        <p className="text-sm text-muted">
          Add locations in{" "}
          <a href="/tools" className="underline hover:text-ink">
            Tools
          </a>{" "}
          first, then assign yarns to them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={selectAll}
          className="rounded-full border border-border bg-white/60 px-4 py-1.5 text-sm text-muted transition hover:text-ink"
        >
          Select all
        </button>
        <button
          onClick={selectNone}
          className="rounded-full border border-border bg-white/60 px-4 py-1.5 text-sm text-muted transition hover:text-ink"
        >
          Clear
        </button>
        <div className="flex-1" />
        <button
          onClick={print}
          disabled={!selected.size || loading}
          className="rounded-full bg-grad-signature px-6 py-2 text-sm font-medium text-white shadow-glow transition disabled:opacity-40"
        >
          {loading
            ? "Generating…"
            : `Print ${selected.size ? `${selected.size} label${selected.size > 1 ? "s" : ""}` : "labels"}`}
        </button>
      </div>

      {/* Location grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => {
          const checked = selected.has(loc.id);
          return (
            <button
              key={loc.id}
              onClick={() => toggle(loc.id)}
              className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition ${
                checked
                  ? "border-accent bg-accent/5 shadow-glow"
                  : "border-border bg-white/60 hover:border-accent/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs transition ${
                    checked
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-white"
                  }`}
                >
                  {checked && "✓"}
                </div>
                <span className="font-display text-base font-semibold text-ink">
                  {loc.name}
                </span>
              </div>
              <span className="ml-7 text-sm text-muted">
                {loc.yarns.length === 0
                  ? "Empty"
                  : loc.yarns.length === 1
                    ? "1 yarn"
                    : `${loc.yarns.length} yarns`}
              </span>
              {loc.yarns.length > 0 && (
                <div className="ml-7 mt-1 flex flex-wrap gap-1">
                  {loc.yarns.slice(0, 4).map((y, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-muted"
                    >
                      {y.brand}{y.colorway ? ` — ${y.colorway}` : ""}
                    </span>
                  ))}
                  {loc.yarns.length > 4 && (
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-muted">
                      +{loc.yarns.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
