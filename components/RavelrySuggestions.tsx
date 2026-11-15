"use client";

// "From Ravelry" row for "What can I make?". Loads in the browser so a slow
// Ravelry response never holds up the page. Used on the yarn page and on
// /stash/make.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { WeightCategory } from "@/lib/mock";
import type { Suggestion } from "@/lib/suggestions";

type Response = {
  enabled: boolean;
  demo?: boolean;
  weight?: WeightCategory | null;
  yardsOnHand?: number;
  linkedYarns?: number;
  suggestions: Suggestion[];
  error?: string;
};

type SaveState = "saving" | "saved" | "error";

export function RavelrySuggestions({
  endpoint,
  params,
  fallbackWeight,
  scope = "this yarn",
  narrow = false,
}: {
  endpoint: string;
  params?: Record<string, string>;
  fallbackWeight: WeightCategory;
  scope?: string; // "this yarn" / "these yarns", for the copy
  narrow?: boolean; // sits in a side column: cap at 3 cards per row
}) {
  const router = useRouter();
  const [freeOnly, setFreeOnly] = useState(false);
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [saves, setSaves] = useState<Record<number, SaveState>>({});

  const url = useMemo(() => {
    const qs = new URLSearchParams({ ...params, ...(freeOnly ? { free: "1" } : {}) });
    return `${endpoint}?${qs.toString()}`;
  }, [endpoint, params, freeOnly]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    // Debounce so ticking several yarns on /stash/make sends one request.
    const t = setTimeout(async () => {
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        const json = (await res.json()) as Response;
        if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
        setData(json);
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [url, attempt]);

  async function save(p: Suggestion) {
    setSaves((s) => ({ ...s, [p.id]: "saving" }));
    const fd = new FormData();
    fd.set("name", p.name);
    if (p.designer) fd.set("designer", p.designer);
    fd.set("external_url", p.url);
    fd.set("yarn_weight", p.weight ?? fallbackWeight);
    if (p.yardage) fd.set("required_yardage", String(p.yardage));
    if (p.gauge) fd.set("gauge", p.gauge);
    if (p.needles.length) fd.set("needle_size", p.needles.join(", "));
    try {
      const res = await fetch("/api/patterns", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      setSaves((s) => ({ ...s, [p.id]: "saved" }));
      router.refresh(); // the library row is server-rendered
    } catch (err) {
      console.warn("[save pattern]", err);
      setSaves((s) => ({ ...s, [p.id]: "error" }));
    }
  }

  if (data && !data.enabled) return null;

  const yards = data?.yardsOnHand ?? 0;
  const weight = data?.weight ?? fallbackWeight;
  const list = data?.suggestions ?? [];

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            From Ravelry
            {data?.demo && (
              <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] normal-case tracking-normal">
                demo data
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {data?.linkedYarns ? `Patterns made with ${scope} first, then popular` : "Popular"}{" "}
            {weight} patterns whose smallest size fits{" "}
            {yards ? `${yards.toLocaleString("en-US")} yd` : "your yarn"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFreeOnly((v) => !v)}
          aria-pressed={freeOnly}
          className={clsx(
            "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
            freeOnly
              ? "bg-grad-signature text-white shadow-glow"
              : "border border-border bg-white/70 text-muted hover:text-ink"
          )}
        >
          Free only
        </button>
      </div>

      {error ? (
        <div className="card mt-4 flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-muted">{error}</p>
          <button type="button" className="btn-ghost mt-1" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : loading && !data ? (
        <Grid narrow={narrow}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-[4/5] animate-shimmer bg-[linear-gradient(90deg,#F4F2F8,#ECE8F3,#F4F2F8)] bg-[length:200%_100%]" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-3/4 rounded bg-tint" />
                <div className="h-3 w-1/2 rounded bg-tint" />
              </div>
            </div>
          ))}
        </Grid>
      ) : list.length === 0 ? (
        <div className="card mt-4 flex flex-col items-center gap-2 py-10 text-center">
          <div className="h-10 w-10 rounded-full bg-grad-cool opacity-70" />
          <p className="max-w-sm text-sm text-muted">
            Nothing on Ravelry fits {yards.toLocaleString("en-US")} yd of {weight}
            {freeOnly ? " for free" : ""} that isn&apos;t already in your library.
            {freeOnly ? " Try turning off “Free only”." : ""}
          </p>
        </div>
      ) : (
        <Grid dim={loading} narrow={narrow}>
          {list.map((p) => (
            <SuggestionCard
              key={p.id}
              p={p}
              yards={yards}
              save={saves[p.id]}
              onSave={() => save(p)}
            />
          ))}
        </Grid>
      )}
    </div>
  );
}

function Grid({
  children,
  dim,
  narrow,
}: {
  children: React.ReactNode;
  dim?: boolean;
  narrow?: boolean;
}) {
  return (
    <div
      className={clsx(
        "mt-4 grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3",
        !narrow && "lg:grid-cols-4",
        dim && "opacity-60"
      )}
    >
      {children}
    </div>
  );
}

function price(p: Suggestion): string {
  if (p.free) return "Free";
  if (p.price == null) return "Paid";
  if (p.currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: p.currency,
        maximumFractionDigits: p.price % 1 === 0 ? 0 : 2,
      }).format(p.price);
    } catch {
      /* unknown currency code — fall through */
    }
  }
  return `${p.currencySymbol ?? "$"}${p.price}`;
}

function SuggestionCard({
  p,
  yards,
  save,
  onSave,
}: {
  p: Suggestion;
  yards: number;
  save?: SaveState;
  onSave: () => void;
}) {
  const need = p.yardage ?? 0;
  const needMax = p.yardageMax && p.yardageMax > need ? p.yardageMax : null;
  const allSizes = !needMax || needMax <= yards;
  const fill = Math.min(1, need / Math.max(yards, 1));

  return (
    <article className="card flex flex-col overflow-hidden">
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-[4/5] w-full overflow-hidden bg-tint"
      >
        {p.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.photo}
            alt={p.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-grad-cool opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="font-display text-lg leading-tight tracking-tight drop-shadow-sm md:text-xl">
            {p.name}
          </p>
          {p.designer && <p className="truncate text-xs text-white/85">{p.designer}</p>}
        </div>
        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-1.5">
          {p.match === "yarn" ? (
            <span className="whitespace-nowrap rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur md:px-2.5 md:text-[11px]">
              Uses this yarn
            </span>
          ) : (
            <span />
          )}
          <span
            className={clsx(
              "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium md:px-2.5 md:text-[11px]",
              p.free ? "bg-accent-mint/90 text-ink" : "bg-white/85 text-ink"
            )}
          >
            {price(p)}
          </span>
        </div>
      </a>

      <div className="flex flex-1 flex-col gap-2.5 p-3 text-xs">
        <div>
          <p className="text-ink">
            Needs {need.toLocaleString("en-US")}
            {needMax ? `–${needMax.toLocaleString("en-US")}` : ""} yd
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-tint" aria-hidden>
            <div className="h-full rounded-full bg-grad-signature" style={{ width: `${fill * 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            You have {yards.toLocaleString("en-US")} yd ·{" "}
            {allSizes ? "every size fits" : "smaller sizes fit"}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onSave}
            disabled={save === "saving" || save === "saved"}
            className={clsx(
              "rounded-full px-3 py-2 text-xs font-medium transition",
              save === "saved"
                ? "bg-tint text-muted"
                : "border border-border bg-white hover:border-accent-lavender hover:text-ink"
            )}
          >
            {save === "saved"
              ? "✓ Saved"
              : save === "saving"
                ? "Saving…"
                : save === "error"
                  ? "Couldn't save — retry"
                  : "Save to my patterns"}
          </button>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-[11px] text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            View on Ravelry ↗
          </a>
        </div>
      </div>
    </article>
  );
}
