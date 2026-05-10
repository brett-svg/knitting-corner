"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Project, Yarn } from "@/lib/mock";

type StatusFilter = "All" | Project["status"];

const STATUSES: StatusFilter[] = [
  "All",
  "Active",
  "Planned",
  "Paused",
  "Completed",
];

export function ProjectsClient({
  projects,
  yarns,
}: {
  projects: Project[];
  yarns: Yarn[];
}) {
  const [status, setStatus] = useState<StatusFilter>("All");

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      All: projects.length,
      Planned: 0,
      Active: 0,
      Paused: 0,
      Completed: 0,
    };
    for (const p of projects) c[p.status]++;
    return c;
  }, [projects]);

  const filtered = useMemo(
    () =>
      status === "All" ? projects : projects.filter((p) => p.status === status),
    [projects, status]
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Workshop
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">
            Your <span className="italic text-grad">projects</span>
          </h1>
          <p className="mt-2 text-muted">
            {filtered.length} of {projects.length} shown · tap to update
            progress, status, and yarn.
          </p>
        </div>
        <Link href="/projects/new" className="btn-grad">
          + New project
        </Link>
      </header>

      {projects.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={clsx(
                "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                status === s
                  ? "bg-grad-signature text-white shadow-glow"
                  : "border border-border bg-white/70 text-muted hover:text-ink"
              )}
            >
              {s}{" "}
              <span className={clsx("opacity-70", status === s && "opacity-90")}>
                · {counts[s]}
              </span>
            </button>
          ))}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-grad-cool" />
          <p className="font-display text-2xl">Nothing on the needles</p>
          <p className="max-w-sm text-sm text-muted">
            Pick a pattern and assign some yarn to start your first project.
          </p>
          <Link href="/projects/new" className="btn-grad mt-2">
            Start a project
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-12 text-center">
          <div className="h-10 w-10 rounded-full bg-grad-warm opacity-70" />
          <p className="font-display text-xl">No {status.toLowerCase()} projects</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((p) => {
            const linked = yarns.filter((y) => p.yarnIds.includes(y.id));
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <div
                  className="aspect-[16/8] w-full"
                  style={{ background: p.hero }}
                />
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-2xl tracking-tight">
                      {p.name}
                    </p>
                    <span className="chip">{p.status}</span>
                  </div>
                  <p className="text-sm text-muted">
                    Pattern by {p.pattern}
                    {p.recipient && (
                      <>
                        {" · "}for{" "}
                        <span className="text-ink">{p.recipient}</span>
                      </>
                    )}
                  </p>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-tint">
                    <div
                      className="h-full rounded-full bg-grad-signature"
                      style={{ width: `${Math.round(p.progress * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <p className="text-xs text-muted">Yarn:</p>
                    <div className="flex -space-x-2">
                      {linked.map((y) => (
                        <span
                          key={y.id}
                          title={`${y.brand} · ${y.colorway}`}
                          className="h-6 w-6 rounded-full ring-2 ring-white"
                          style={{ background: y.swatch }}
                        />
                      ))}
                    </div>
                    <p className="ml-auto text-xs text-muted">
                      {linked.length} skein{linked.length === 1 ? "" : "s"}{" "}
                      reserved
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
