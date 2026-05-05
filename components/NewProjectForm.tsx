"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import type { Pattern, Yarn } from "@/lib/mock";

const STATUSES = ["Planned", "Active", "Paused", "Completed"] as const;

export function NewProjectForm({
  patterns,
  yarns,
}: {
  patterns: Pattern[];
  yarns: Yarn[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [patternId, setPatternId] = useState<string>("");
  const [yarnIds, setYarnIds] = useState<string[]>([]);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Active");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pattern = patterns.find((p) => p.id === patternId);
  const filteredYarns = pattern?.yarnWeight
    ? yarns.filter((y) => y.weight === pattern.yarnWeight)
    : yarns;
  const allocatedYards = yarnIds
    .map((id) => yarns.find((y) => y.id === id))
    .filter((y): y is Yarn => Boolean(y))
    .reduce((n, y) => n + y.yardage * y.skeins, 0);

  function toggleYarn(id: string) {
    setYarnIds((prev) =>
      prev.includes(id) ? prev.filter((y) => y !== id) : [...prev, id]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          patternId: patternId || null,
          yarnIds,
          status,
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      router.push(`/projects/${json.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Workshop
        </p>
        <h1 className="mt-1 font-display text-5xl tracking-tight">
          Start a <span className="italic text-grad">project</span>
        </h1>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <div className="card space-y-5 p-6">
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Featherweight in lilac"
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Pattern
              </span>
              <select
                value={patternId}
                onChange={(e) => {
                  setPatternId(e.target.value);
                  setYarnIds([]);
                }}
                className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
              >
                <option value="">— None —</option>
                {patterns.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.designer ? ` · ${p.designer}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Status
              </span>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as (typeof STATUSES)[number])
                }
                className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Notes
            </span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember when you start…"
              className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
            />
          </label>
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Allocate yarn
              </p>
              <p className="mt-1 font-display text-2xl tracking-tight">
                {pattern?.yarnWeight
                  ? `${pattern.yarnWeight} weight from your stash`
                  : "Pick from your stash"}
              </p>
            </div>
            {pattern?.requiredYardage && (
              <p
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs",
                  allocatedYards >= pattern.requiredYardage
                    ? "border-accent-teal/50 bg-accent-teal/10 text-ink"
                    : "border-border bg-white text-muted"
                )}
              >
                {allocatedYards.toLocaleString()} /{" "}
                {pattern.requiredYardage.toLocaleString()} yds
              </p>
            )}
          </div>

          {filteredYarns.length === 0 ? (
            <p className="rounded-xl border border-border bg-tint/40 px-4 py-4 text-sm text-muted">
              No yarn matches that weight. Pick a different pattern, or scan
              new yarn.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredYarns.map((y) => {
                const selected = yarnIds.includes(y.id);
                return (
                  <button
                    type="button"
                    key={y.id}
                    onClick={() => toggleYarn(y.id)}
                    className={clsx(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                      selected
                        ? "border-transparent bg-grad-signature text-white shadow-glow"
                        : "border-border bg-white hover:bg-tint/60"
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
                      <span
                        className={clsx(
                          "block truncate text-xs",
                          selected ? "text-white/85" : "text-muted"
                        )}
                      >
                        {y.brand} · {y.weight} · {y.yardage * y.skeins} yds
                      </span>
                    </span>
                    <span
                      className={clsx(
                        "h-5 w-5 rounded-full border",
                        selected
                          ? "border-white bg-white"
                          : "border-border bg-white"
                      )}
                    >
                      {selected && (
                        <svg
                          viewBox="0 0 20 20"
                          className="h-full w-full text-accent-violet"
                          fill="currentColor"
                          aria-hidden
                        >
                          <path d="M7.5 13.5 4 10l1.4-1.4 2.1 2.1 6.1-6.1L15 6Z" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-grad disabled:opacity-60">
            {busy ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
