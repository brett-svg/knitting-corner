"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import type { Project } from "@/lib/mock";

const STATUSES = ["Planned", "Active", "Paused", "Completed"] as const;

export function ProjectEditor({ project }: { project: Project }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>(
    project.status
  );
  const [progress, setProgress] = useState<number>(project.progress);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Save failed");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
    startTransition(() => router.refresh());
  }

  return (
    <section className="card space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                patch({ status: s });
              }}
              className={clsx(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                status === s
                  ? "bg-grad-signature text-white shadow-glow"
                  : "border border-border bg-white text-muted hover:text-ink"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          {isPending
            ? "Saving…"
            : savedAt
              ? `Saved at ${savedAt}`
              : `Updated ${project.updatedAt}`}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-wider text-muted">
            Progress
          </p>
          <p className="font-display text-2xl">
            {Math.round(progress * 100)}%
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(progress * 100)}
          onChange={(e) => setProgress(Number(e.target.value) / 100)}
          onPointerUp={() => patch({ progress })}
          onKeyUp={() => patch({ progress })}
          className="w-full accent-accent-violet"
          aria-label="Progress"
        />
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-tint">
          <div
            className="h-full rounded-full bg-grad-signature transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
          {error}
        </p>
      )}
    </section>
  );
}
