"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { StorageLocation, WeightCategory } from "@/lib/mock";
import type { SessionDto, SessionItemDto } from "@/lib/sessions";
import type { YarnLabel } from "@/lib/yarn-label";

const WEIGHTS: WeightCategory[] = ["Lace", "Fingering", "Sport", "DK", "Worsted", "Aran", "Bulky"];

type Data = { session: SessionDto; items: SessionItemDto[] };

export function ReviewClient({
  initial,
  locations,
}: {
  initial: Data;
  locations: StorageLocation[];
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [committing, setCommitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  const { session, items } = data;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${session.id}`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as Data);
    } catch {
      /* transient */
    }
  }, [session.id]);

  const reading = items.some((i) => i.status === "captured" || i.status === "extracting");
  useEffect(() => {
    if (session.status !== "open") return;
    const t = setInterval(refresh, reading ? 2500 : 5000);
    return () => clearInterval(t);
  }, [refresh, reading, session.status]);

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  async function patchItem(id: string, body: Record<string, unknown>, optimistic?: Partial<SessionItemDto>) {
    if (optimistic) {
      setData((d) => ({
        ...d,
        items: d.items.map((i) => (i.id === id ? { ...i, ...optimistic } : i)),
      }));
    }
    const res = await fetch(`/api/sessions/${session.id}/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast((await res.json()).error ?? "Couldn't save");
      await refresh();
    }
  }

  async function patchSession(body: Record<string, unknown>) {
    setData((d) => ({ ...d, session: { ...d.session, ...body } as SessionDto }));
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function focusNextAfter(id: string) {
    const reviewable = items.filter((i) => i.status === "extracted" || i.status === "failed");
    const idx = reviewable.findIndex((i) => i.id === id);
    const next = reviewable[idx + 1] ?? reviewable[idx - 1];
    if (!next) return;
    const row = rowRefs.current.get(next.id);
    row?.querySelector<HTMLInputElement>("input")?.focus();
  }

  async function accept(id: string) {
    await patchItem(id, { status: "accepted" }, { status: "accepted" });
  }
  async function discard(id: string) {
    await patchItem(id, { status: "discarded" }, { status: "discarded" });
  }
  async function restore(id: string) {
    await patchItem(id, { status: "extracted" }, { status: "extracted" });
  }

  async function acceptAll() {
    const ids = items.filter((i) => i.status === "extracted" && i.label).map((i) => i.id);
    await Promise.all(ids.map((id) => accept(id)));
    toast(`Accepted ${ids.length}`);
  }

  async function commit() {
    setCommitting(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/commit`, { method: "POST" });
      const json = (await res.json()) as {
        inserted?: number;
        merged?: number;
        skipped?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Commit failed");
      toast(
        `Added ${json.inserted} new, merged ${json.merged} into existing${json.skipped ? `, skipped ${json.skipped}` : ""}`
      );
      await refresh();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setCommitting(false);
    }
  }

  const c = session.counts;
  const toReview = c.extracted + c.failed;
  const visible = items.filter((i) => showDone || (i.status !== "committed" && i.status !== "discarded"));
  const hidden = items.length - visible.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            <Link href="/stash/sessions" className="hover:text-ink">
              Sessions
            </Link>{" "}
            / review
          </p>
          <input
            defaultValue={session.name}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== session.name) patchSession({ name: v });
            }}
            className="mt-1 w-full max-w-xl bg-transparent font-display text-4xl tracking-tight outline-none focus:underline md:text-5xl"
            aria-label="Session name"
          />
          <p className="mt-2 text-muted">
            {c.total} item{c.total === 1 ? "" : "s"} · {c.skeins} skein{c.skeins === 1 ? "" : "s"}
            {c.captured + c.extracting ? ` · ${c.captured + c.extracting} reading` : ""}
            {toReview ? ` · ${toReview} to review` : ""}
            {c.accepted ? ` · ${c.accepted} ready to commit` : ""}
            {c.committed ? ` · ${c.committed} in stash` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session.status === "open" && (
            <Link href={`/stash/sessions/${session.id}/capture`} className="btn-ghost">
              Scan on phone
            </Link>
          )}
          <button onClick={acceptAll} disabled={!c.extracted} className="btn-ghost disabled:opacity-40">
            Accept all ({c.extracted})
          </button>
          <button
            onClick={commit}
            disabled={committing || !c.accepted}
            className="btn-grad disabled:opacity-60"
          >
            {committing ? "Committing…" : `Commit ${c.accepted} to stash`}
          </button>
        </div>
      </header>

      <div className="card flex flex-wrap items-center gap-4 p-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Default location</span>
          <select
            value={session.defaultLocationId ?? ""}
            onChange={(e) => patchSession({ defaultLocationId: e.target.value || null })}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 outline-none focus:border-accent-lavender"
          >
            <option value="">— none —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted">
          Tip: <kbd className="rounded border border-border px-1">Enter</kbd> in a row accepts it and
          moves to the next. Fields tagged <Tag>R</Tag> came from Ravelry.
        </span>
        {hidden > 0 && (
          <button onClick={() => setShowDone((v) => !v)} className="ml-auto text-xs underline">
            {showDone ? "Hide" : "Show"} {hidden} committed/discarded
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          Nothing here yet. Open this session on your phone and start snapping —
          items appear here as they&apos;re read.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-tint/60 text-left text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <Th className="w-10">#</Th>
                <Th className="w-16">Photo</Th>
                <Th>Brand</Th>
                <Th>Line</Th>
                <Th>Colorway</Th>
                <Th className="w-24">Dye lot</Th>
                <Th className="w-28">Weight</Th>
                <Th className="w-20">Yds</Th>
                <Th className="w-16">g</Th>
                <Th className="w-20">Skeins</Th>
                <Th className="w-40">Location</Th>
                <Th className="w-56">Match</Th>
                <Th className="w-44">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((it) => (
                <Row
                  key={it.id}
                  item={it}
                  locations={locations}
                  defaultLocationId={session.defaultLocationId}
                  rowRef={(el) => {
                    if (el) rowRefs.current.set(it.id, el);
                    else rowRefs.current.delete(it.id);
                  }}
                  onPatch={(body, optimistic) => patchItem(it.id, body, optimistic)}
                  onAccept={async () => {
                    await accept(it.id);
                    focusNextAfter(it.id);
                  }}
                  onDiscard={() => discard(it.id)}
                  onRestore={() => restore(it.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {flash && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 md:bottom-8">
          <p className="rounded-full bg-ink px-4 py-2 text-sm text-white shadow-soft">{flash}</p>
        </div>
      )}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────

function Row({
  item,
  locations,
  defaultLocationId,
  rowRef,
  onPatch,
  onAccept,
  onDiscard,
  onRestore,
}: {
  item: SessionItemDto;
  locations: StorageLocation[];
  defaultLocationId: string | null;
  rowRef: (el: HTMLTableRowElement | null) => void;
  onPatch: (body: Record<string, unknown>, optimistic?: Partial<SessionItemDto>) => Promise<void>;
  onAccept: () => void;
  onDiscard: () => void;
  onRestore: () => void;
}) {
  const [draft, setDraft] = useState<YarnLabel | null>(item.label);
  const [skeins, setSkeins] = useState(item.skeins);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [overrides, setOverrides] = useState<string[]>(item.ravelry?.overrides ?? []);

  // Take server updates unless we're mid-edit.
  useEffect(() => {
    if (dirty.current) return;
    setDraft(item.label);
    setSkeins(item.skeins);
    setOverrides(item.ravelry?.overrides ?? []);
  }, [item.label, item.skeins, item.ravelry, item.updatedAt]);

  function queueSave(body: Record<string, unknown>) {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await onPatch(body);
      dirty.current = false;
    }, 500);
  }

  function edit<K extends keyof YarnLabel>(k: K, v: YarnLabel[K]) {
    const next = { ...(draft ?? emptyLabel()), [k]: v };
    setDraft(next);
    setOverrides((o) => o.filter((x) => x !== k));
    queueSave({ label: next });
  }

  function editSkeins(n: number) {
    const v = Math.max(1, Math.round(n) || 1);
    setSkeins(v);
    queueSave({ skeins: v });
  }

  const s = item.status;
  const muted = s === "discarded" || s === "committed";
  const busy = s === "captured" || s === "extracting";
  const editable = !muted && !busy;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement) && editable) {
      e.preventDefault();
      // Flush a pending edit before accepting.
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void onPatch({ label: draft, skeins }).then(() => (dirty.current = false));
      }
      onAccept();
    }
  }

  const thumb = item.imageUrls[0];

  return (
    <tr
      ref={rowRef}
      onKeyDown={onKeyDown}
      className={clsx(
        "align-top",
        s === "accepted" && "bg-accent-teal/5",
        s === "failed" && "bg-accent-rose/5",
        muted && "opacity-50"
      )}
    >
      <Td className="pt-3 text-xs text-muted">{item.seq}</Td>
      <Td>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-tint" />
        )}
        {item.imageUrls.length > 1 && (
          <p className="mt-0.5 text-[10px] text-muted">{item.imageUrls.length} photos</p>
        )}
      </Td>

      {busy ? (
        <Td colSpan={10} className="pt-4 text-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-violet" />{" "}
          Reading the label…
        </Td>
      ) : s === "failed" && !draft ? (
        <Td colSpan={10} className="pt-4 text-accent-rose">
          Couldn&apos;t read this one{item.error ? `: ${item.error}` : ""}.
        </Td>
      ) : (
        <>
          <Td>
            <Cell value={draft?.brand} onChange={(v) => edit("brand", v)} r={overrides.includes("brand")} disabled={!editable} />
          </Td>
          <Td>
            <Cell value={draft?.product_line} onChange={(v) => edit("product_line", v)} r={overrides.includes("product_line")} disabled={!editable} />
          </Td>
          <Td>
            <Cell value={draft?.colorway} onChange={(v) => edit("colorway", v)} disabled={!editable} />
          </Td>
          <Td>
            <Cell value={draft?.dye_lot} onChange={(v) => edit("dye_lot", v)} disabled={!editable} />
          </Td>
          <Td>
            <span className="relative block">
              <select
                value={draft?.weight_category ?? ""}
                onChange={(e) => edit("weight_category", e.target.value || null)}
                disabled={!editable}
                className={inputCls}
              >
                <option value="">—</option>
                {WEIGHTS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              {overrides.includes("weight_category") && <Tag abs>R</Tag>}
            </span>
          </Td>
          <Td>
            <Cell type="number" value={draft?.yardage} onChange={(v) => edit("yardage", v === "" ? null : Number(v))} r={overrides.includes("yardage")} disabled={!editable} />
          </Td>
          <Td>
            <Cell type="number" value={draft?.skein_weight_grams} onChange={(v) => edit("skein_weight_grams", v === "" ? null : Number(v))} r={overrides.includes("skein_weight_grams")} disabled={!editable} />
          </Td>
          <Td>
            <input
              type="number"
              min={1}
              value={skeins}
              onChange={(e) => editSkeins(Number(e.target.value))}
              disabled={!editable}
              className={clsx(inputCls, "font-medium")}
            />
          </Td>
          <Td>
            <select
              value={item.locationId ?? ""}
              onChange={(e) =>
                onPatch({ locationId: e.target.value || null }, { locationId: e.target.value || null })
              }
              disabled={!editable}
              className={inputCls}
            >
              <option value="">
                {defaultLocationId
                  ? `(default) ${locations.find((l) => l.id === defaultLocationId)?.name ?? ""}`
                  : "— none —"}
              </option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Td>
          <Td className="text-xs">
            {item.match ? (
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={item.mergeIntoMatch}
                  onChange={(e) =>
                    onPatch({ mergeIntoMatch: e.target.checked }, { mergeIntoMatch: e.target.checked })
                  }
                  disabled={!editable}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">
                    {item.mergeIntoMatch ? "Merge" : "Keep separate"}
                  </span>
                  <br />
                  <span className="text-muted">
                    have {item.match.skeins} · {item.match.brand} {item.match.colorway}
                    {item.match.dyeLot ? ` · lot ${item.match.dyeLot}` : ""}
                    {item.mergeIntoMatch ? ` → ${item.match.skeins + skeins}` : ""}
                  </span>
                </span>
              </label>
            ) : item.ravelry?.yarn ? (
              <span className="text-muted">
                New ·{" "}
                <a href={item.ravelry.yarn.url} target="_blank" rel="noreferrer" className="underline">
                  Ravelry ↗
                </a>
                {item.ravelry.matchedBy === "ai" ? " (AI pick)" : ""}
              </span>
            ) : (
              <span className="text-muted">New · no Ravelry match</span>
            )}
          </Td>
        </>
      )}

      <Td>
        <div className="flex flex-wrap gap-1.5">
          {s === "committed" && item.committedYarnId && (
            <Link href={`/stash/${item.committedYarnId}`} className="btn-ghost px-2.5 py-1 text-xs">
              View in stash
            </Link>
          )}
          {s === "discarded" && (
            <button onClick={onRestore} className="btn-ghost px-2.5 py-1 text-xs">
              Restore
            </button>
          )}
          {(s === "extracted" || s === "failed") && draft && (
            <button onClick={onAccept} className="btn-grad px-2.5 py-1 text-xs">
              Accept
            </button>
          )}
          {s === "accepted" && (
            <button onClick={onRestore} className="btn-ghost px-2.5 py-1 text-xs">
              Un-accept
            </button>
          )}
          {s === "failed" && (
            <button onClick={() => onPatch({ retry: true }, { status: "extracting" })} className="btn-ghost px-2.5 py-1 text-xs">
              Retry
            </button>
          )}
          {!muted && !busy && (
            <button onClick={onDiscard} className="btn-ghost px-2.5 py-1 text-xs text-accent-rose">
              Discard
            </button>
          )}
        </div>
      </Td>
    </tr>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_3px_rgba(192,132,252,0.15)] disabled:bg-transparent disabled:border-transparent";

function Cell({
  value,
  onChange,
  type = "text",
  r,
  disabled,
}: {
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  type?: string;
  r?: boolean;
  disabled?: boolean;
}) {
  return (
    <span className="relative block">
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={clsx(inputCls, r && "pr-6")}
      />
      {r && <Tag abs>R</Tag>}
    </span>
  );
}

function Tag({ children, abs }: { children: React.ReactNode; abs?: boolean }) {
  return (
    <span
      title="Filled from Ravelry"
      className={clsx(
        "rounded-full bg-accent-violet/15 px-1.5 text-[9px] font-medium leading-4 text-accent-violet",
        abs && "pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
      )}
    >
      {children}
    </span>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={clsx("px-2 py-2 font-medium first:pl-3", className)}>{children}</th>;
}
function Td({
  children,
  className,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={clsx("px-2 py-2 first:pl-3", className)}>
      {children}
    </td>
  );
}

function emptyLabel(): YarnLabel {
  return {
    brand: null,
    product_line: null,
    fiber: null,
    weight_category: null,
    yardage: null,
    meters: null,
    skein_weight_grams: null,
    colorway: null,
    dye_lot: null,
    needle_size: null,
    swatch_hex: null,
  };
}
