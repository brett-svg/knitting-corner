"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Phase = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setPhase("sending");
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const next =
        new URLSearchParams(window.location.search).get("next") ?? "/";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            next
          )}`,
        },
      });
      if (error) throw error;
      setPhase("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send link");
      setPhase("error");
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="card grad-border space-y-6 p-8">
        <div className="space-y-2">
          <span
            aria-hidden
            className="block h-9 w-9 rounded-full bg-grad-signature shadow-glow"
          />
          <h1 className="font-display text-4xl tracking-tight">
            Welcome to your <span className="italic text-grad">corner</span>
          </h1>
          <p className="text-sm text-muted">
            We'll send a magic link — no password, no fuss.
          </p>
        </div>

        {phase === "sent" ? (
          <div className="space-y-2">
            <p className="font-display text-xl">Check your email</p>
            <p className="text-sm text-muted">
              A sign-in link is on its way to{" "}
              <span className="text-ink">{email}</span>.
            </p>
            <button
              onClick={() => {
                setPhase("idle");
                setEmail("");
              }}
              className="text-sm text-muted underline hover:text-ink"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4">
            <label className="block text-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
              />
            </label>
            <button
              type="submit"
              disabled={phase === "sending"}
              className="btn-grad w-full disabled:opacity-60"
            >
              {phase === "sending" ? "Sending…" : "Send magic link →"}
            </button>
            {error && (
              <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
