"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { StorageLocation } from "@/lib/mock";
import type { SessionDto, SessionItemDto } from "@/lib/sessions";
import { compressToDataUrl } from "@/lib/image-client";

type Pending = {
  key: string;
  thumb: string;
  images: string[];
  error: string | null;
};

export function CaptureClient({
  initial,
  locations,
}: {
  initial: { session: SessionDto; items: SessionItemDto[] };
  locations: StorageLocation[];
}) {
  const [session, setSession] = useState(initial.session);
  const [items, setItems] = useState(initial.items);
  const [pending, setPending] = useState<Pending[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null); // item id awaiting a back photo
  const [flash, setFlash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        session: SessionDto;
        items: SessionItemDto[];
      };
      setSession(json.session);
      setItems(json.items);
    } catch {
      /* offline — keep what we have */
    }
  }, [session.id]);

  // Poll faster while something is still being read.
  const busy = items.some(
    (i) => i.status === "captured" || i.status === "extracting",
  );
  useEffect(() => {
    const t = setInterval(refresh, busy ? 2500 : 8000);
    return () => clearInterval(t);
  }, [refresh, busy]);

  function buzz(ms = 25) {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* unsupported */
    }
  }

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1600);
  }

  async function upload(p: Pending) {
    try {
      const res = await fetch(`/api/sessions/${session.id}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ images: p.images }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      setPending((q) => q.filter((x) => x.key !== p.key));
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setPending((q) =>
        q.map((x) => (x.key === p.key ? { ...x, error: msg } : x)),
      );
    }
  }

  // Shutter: compress → optimistic tray entry → upload → camera is free again.
  async function onShot(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    buzz();
    const images = await Promise.all(
      files.map((f) => compressToDataUrl(f, 1280, 0.82)),
    );
    const p: Pending = {
      key: crypto.randomUUID(),
      thumb: images[0],
      images,
      error: null,
    };
    setPending((q) => [p, ...q]);
    void upload(p);
  }

  async function onBackShot(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (backRef.current) backRef.current.value = "";
    const id = addingTo;
    setAddingTo(null);
    if (!files.length || !id) return;
    buzz();
    const images = await Promise.all(
      files.map((f) => compressToDataUrl(f, 1280, 0.82)),
    );
    await patch(id, { addImages: images });
    toast("Re-reading with the back of the band");
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/sessions/${session.id}/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) toast((await res.json()).error ?? "Couldn't update");
    await refresh();
  }

  async function remove(id: string) {
    setSelected(null);
    await fetch(`/api/sessions/${session.id}/items/${id}`, {
      method: "DELETE",
    });
    await refresh();
  }

  const last = items[items.length - 1] ?? null;
  async function sameAsLast() {
    if (!last) return;
    buzz(40);
    setItems((list) =>
      list.map((i) => (i.id === last.id ? { ...i, skeins: i.skeins + 1 } : i)),
    );
    toast(`${describe(last)} · now ×${last.skeins + 1}`);
    await patch(last.id, { incrementSkeins: 1 });
  }

  async function setDefaultLocation(locationId: string) {
    setSession((s) => ({ ...s, defaultLocationId: locationId || null }));
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultLocationId: locationId || null }),
    });
  }

  const sel = selected ? (items.find((i) => i.id === selected) ?? null) : null;
  const closed = session.status !== "open";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-lg flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Counting
          </p>
          <h1 className="truncate font-display text-3xl tracking-tight">
            {session.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {items.length} item{items.length === 1 ? "" : "s"} ·{" "}
            {session.counts.skeins} skein
            {session.counts.skeins === 1 ? "" : "s"}
            {busy ? " · reading…" : ""}
          </p>
        </div>
        <Link
          href={`/stash/sessions/${session.id}`}
          className="btn-ghost shrink-0 text-sm"
        >
          Review →
        </Link>
      </header>

      <label className="block text-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Everything goes in
        </span>
        <select
          value={session.defaultLocationId ?? ""}
          onChange={(e) => setDefaultLocation(e.target.value)}
          className="mt-1 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2 text-ink outline-none focus:border-accent-lavender"
        >
          <option value="">— pick per skein at review —</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      {closed && (
        <p className="rounded-xl border border-accent-teal/50 bg-accent-teal/10 px-4 py-2 text-sm text-ink">
          This batch is in the stash. Snapping more reopens it.
        </p>
      )}
      <label
        htmlFor="shutter"
        className="card grad-border flex flex-1 cursor-pointer select-none flex-col items-center justify-center gap-3 p-8 text-center active:scale-[0.99]"
      >
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-grad-signature text-white shadow-glow">
          <CameraIcon />
        </div>
        <p className="font-display text-3xl">Snap the band</p>
        <p className="text-sm text-muted">
          One photo per skein. No typing — you&apos;ll review the batch later.
        </p>
        <input
          id="shutter"
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onShot}
          className="sr-only"
        />
      </label>

      <button
        type="button"
        onClick={sameAsLast}
        disabled={!last}
        className="btn-ghost w-full py-4 text-base disabled:opacity-40"
      >
        {last ? (
          <>
            Same as last <span className="mx-1 font-display text-xl">+1</span>
            <span className="text-muted">· {describe(last)}</span>
          </>
        ) : (
          "Same as last +1"
        )}
      </button>

      {/* Hidden input for "+ back photo" on a specific item */}
      <input
        ref={backRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onBackShot}
        className="sr-only"
        tabIndex={-1}
      />

      {(pending.length > 0 || items.length > 0) && (
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Tray · newest first
          </p>
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {pending.map((p) => (
              <li key={p.key} className="shrink-0">
                <TrayCard
                  thumb={p.thumb}
                  title={p.error ? "Upload failed" : "Uploading…"}
                  tone={p.error ? "bad" : "busy"}
                  onClick={
                    p.error ? () => upload({ ...p, error: null }) : undefined
                  }
                  hint={p.error ? "tap to retry" : undefined}
                />
              </li>
            ))}
            {[...items].reverse().map((it) => (
              <li key={it.id} className="shrink-0">
                <TrayCard
                  thumb={it.imageUrls[0]}
                  title={describe(it)}
                  tone={toneOf(it.status)}
                  skeins={it.skeins}
                  photos={it.imageUrls.length}
                  active={selected === it.id}
                  onClick={() => setSelected(selected === it.id ? null : it.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {sel && (
        <div className="card space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                #{sel.seq} · {statusLabel(sel.status)}
              </p>
              <p className="truncate font-display text-xl">{describe(sel)}</p>
              {sel.error && (
                <p className="text-xs text-accent-rose">{sel.error}</p>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-muted"
            >
              close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => patch(sel.id, { incrementSkeins: 1 })}
              className="btn-grad justify-center"
            >
              +1 skein (×{sel.skeins + 1})
            </button>
            <button
              onClick={() => patch(sel.id, { incrementSkeins: -1 })}
              disabled={sel.skeins <= 1}
              className="btn-ghost justify-center disabled:opacity-40"
            >
              −1 skein
            </button>
            {sel.imageUrls.length < 4 && sel.status !== "committed" && (
              <button
                onClick={() => {
                  setAddingTo(sel.id);
                  backRef.current?.click();
                }}
                className="btn-ghost justify-center"
              >
                + back of band
              </button>
            )}
            {sel.status === "failed" && (
              <button
                onClick={() => patch(sel.id, { retry: true })}
                className="btn-ghost justify-center"
              >
                Retry reading
              </button>
            )}
            <button
              onClick={() => remove(sel.id)}
              className="btn-ghost justify-center text-accent-rose"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {flash && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
          <p className="rounded-full bg-ink px-4 py-2 text-sm text-white shadow-soft">
            {flash}
          </p>
        </div>
      )}
    </div>
  );
}

function describe(it: SessionItemDto): string {
  if (it.status === "captured" || it.status === "extracting")
    return "Reading label…";
  if (it.status === "failed") return "Couldn't read";
  const l = it.label;
  if (!l) return "Untitled";
  return (
    [l.brand, l.colorway].filter(Boolean).join(" · ") ||
    l.product_line ||
    "Untitled"
  );
}

function statusLabel(s: SessionItemDto["status"]) {
  return (
    {
      captured: "queued",
      extracting: "reading",
      extracted: "ready to review",
      failed: "failed",
      accepted: "accepted",
      discarded: "discarded",
      committed: "in stash",
    } as const
  )[s];
}

type Tone = "busy" | "ok" | "bad" | "muted";
function toneOf(s: SessionItemDto["status"]): Tone {
  if (s === "captured" || s === "extracting") return "busy";
  if (s === "failed") return "bad";
  if (s === "discarded") return "muted";
  return "ok";
}

function TrayCard({
  thumb,
  title,
  tone,
  skeins,
  photos,
  active,
  hint,
  onClick,
}: {
  thumb: string;
  title: string;
  tone: Tone;
  skeins?: number;
  photos?: number;
  active?: boolean;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-28 rounded-2xl border bg-white p-1.5 text-left transition",
        active ? "border-accent-lavender shadow-glow" : "border-border",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-tint">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="" className="h-full w-full object-cover" />
        {skeins && skeins > 1 ? (
          <span className="absolute right-1 top-1 rounded-full bg-ink px-1.5 text-[11px] font-medium text-white">
            ×{skeins}
          </span>
        ) : null}
        {photos && photos > 1 ? (
          <span className="absolute left-1 top-1 rounded-full bg-white/85 px-1.5 text-[10px] text-ink">
            {photos} photos
          </span>
        ) : null}
        <span
          className={clsx(
            "absolute bottom-1 left-1 h-2.5 w-2.5 rounded-full ring-2 ring-white",
            tone === "busy" && "animate-pulse bg-accent-violet",
            tone === "ok" && "bg-accent-teal",
            tone === "bad" && "bg-accent-rose",
            tone === "muted" && "bg-muted",
          )}
        />
      </div>
      <p className="mt-1 truncate text-[11px] leading-tight text-ink">
        {title}
      </p>
      {hint && <p className="text-[10px] text-muted">{hint}</p>}
    </button>
  );
}

function CameraIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
