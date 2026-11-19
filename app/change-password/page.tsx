"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="card grad-border space-y-6 p-8">
        <div className="space-y-2">
          <span aria-hidden className="block h-9 w-9 rounded-full bg-grad-signature shadow-glow" />
          <h1 className="font-display text-4xl tracking-tight">
            Choose a <span className="italic text-grad">password</span>
          </h1>
          <p className="text-sm text-muted">
            You signed in with a temporary password. Pick your own to continue.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Temporary password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              New password
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="At least 8 characters"
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Confirm new password
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </label>

          <button type="submit" disabled={busy} className="btn-grad w-full disabled:opacity-60">
            {busy ? "Saving…" : "Save password →"}
          </button>

          {error && (
            <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
              {error}
            </p>
          )}
        </form>

        <form action="/auth/signout" method="post" className="border-t border-border pt-4 text-center">
          <button className="text-sm text-muted hover:text-ink">Sign out</button>
        </form>
      </div>
    </div>
  );
}
