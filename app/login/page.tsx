"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Mode = "signin" | "signup" | "magic";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("error");
    if (e) {
      setError(decodeURIComponent(e));
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  function next() {
    return new URLSearchParams(window.location.search).get("next") ?? "/";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = supabaseBrowser();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace(next());
        router.refresh();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next());
          router.refresh();
        } else {
          setInfo(
            "Account created — check your email to confirm, then sign in."
          );
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next())}`,
          },
        });
        if (error) throw error;
        setInfo(`Magic link sent to ${email}.`);
      }
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
          <span
            aria-hidden
            className="block h-9 w-9 rounded-full bg-grad-signature shadow-glow"
          />
          <h1 className="font-display text-4xl tracking-tight">
            Welcome to your <span className="italic text-grad">corner</span>
          </h1>
          <p className="text-sm text-muted">
            {mode === "signin"
              ? "Sign in with your email and password."
              : mode === "signup"
                ? "Create a new account."
                : "We'll email you a one-time link."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
            />
          </label>

          {mode !== "magic" && (
            <label className="block text-sm">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Password
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "•••••••"}
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-grad w-full disabled:opacity-60"
          >
            {busy
              ? "Working…"
              : mode === "signin"
                ? "Sign in →"
                : mode === "signup"
                  ? "Create account →"
                  : "Send magic link →"}
          </button>

          {error && (
            <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-xl border border-accent-teal/50 bg-accent-teal/10 px-3 py-2 text-sm text-ink">
              {info}
            </p>
          )}
        </form>

        <div className="space-y-1 border-t border-border pt-4 text-center text-sm text-muted">
          {mode === "signin" && (
            <>
              <button
                onClick={() => switchMode("signup")}
                className="block w-full hover:text-ink"
              >
                New here? Create an account
              </button>
              <button
                onClick={() => switchMode("magic")}
                className="block w-full hover:text-ink"
              >
                Email me a magic link instead
              </button>
            </>
          )}
          {mode === "signup" && (
            <button
              onClick={() => switchMode("signin")}
              className="block w-full hover:text-ink"
            >
              Already have an account? Sign in
            </button>
          )}
          {mode === "magic" && (
            <button
              onClick={() => switchMode("signin")}
              className="block w-full hover:text-ink"
            >
              Use email + password instead
            </button>
          )}
        </div>
      </div>
    </div>
  );

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }
}
