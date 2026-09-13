"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StorageLocation } from "@/lib/mock";
import type { SessionDto } from "@/lib/sessions";

export function SessionsClient({
  sessions,
  locations,
}: {
  sessions: SessionDto[];
  locations: StorageLocation[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, defaultLocationId: locationId || null }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error ?? "Could not start session");
      router.push(`/stash/sessions/${json.id}/capture`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start session");
      setBusy(false);
    }
  }

  const open = sessions.filter((s) => s.status === "open");
  const done = sessions.filter((s) => s.status !== "open");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Inventory</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">
          Counting <span className="italic text-grad">sessions</span>
        </h1>
        <p className="mt-2 text-muted">
          Snap every skein on your phone without stopping to type. Review the whole batch on a
          bigger screen, then commit it to the stash in one go.
        </p>
      </header>

      <form onSubmit={create} className="card grad-border space-y-4 p-6">
        <p className="font-display text-2xl">Start a new session</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Closet bins, top shelf"
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Everything goes in
            </span>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender"
            >
              <option value="">— pick per skein later —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between">
          <Link href="/stash/add/scan" className="text-sm text-muted underline hover:text-ink">
            Just adding one skein?
          </Link>
          <button type="submit" disabled={busy} className="btn-grad disabled:opacity-60">
            {busy ? "Starting…" : "Start counting →"}
          </button>
        </div>
      </form>

      {open.length > 0 && <SessionList title="In progress" sessions={open} />}
      {done.length > 0 && <SessionList title="Committed" sessions={done} />}
    </div>
  );
}

function SessionList({ title, sessions }: { title: string; sessions: SessionDto[] }) {
  return (
    <section className="space-y-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{title}</p>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {sessions.map((s) => {
          const pending = s.counts.captured + s.counts.extracting;
          const review = s.counts.extracted + s.counts.failed;
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/stash/sessions/${s.id}`} className="font-display text-lg hover:underline">
                  {s.name}
                </Link>
                <p className="text-xs text-muted">
                  {s.counts.total} item{s.counts.total === 1 ? "" : "s"} · {s.counts.skeins} skein
                  {s.counts.skeins === 1 ? "" : "s"}
                  {s.defaultLocationName ? ` · ${s.defaultLocationName}` : ""}
                  {pending ? ` · ${pending} reading` : ""}
                  {review ? ` · ${review} to review` : ""}
                  {s.counts.accepted ? ` · ${s.counts.accepted} ready` : ""}
                  {s.counts.committed ? ` · ${s.counts.committed} in stash` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {s.status === "open" && (
                  <Link href={`/stash/sessions/${s.id}/capture`} className="btn-ghost text-sm">
                    Scan
                  </Link>
                )}
                <Link href={`/stash/sessions/${s.id}`} className="btn-grad text-sm">
                  Review
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
