"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StorageLocation, Yarn } from "@/lib/mock";

const WEIGHTS = [
  "Lace",
  "Fingering",
  "Sport",
  "DK",
  "Worsted",
  "Aran",
  "Bulky",
];

export function YarnEditor({
  yarn,
  locations,
}: {
  yarn: Yarn;
  locations: StorageLocation[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/yarns/${yarn.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${yarn.brand} ${yarn.colorway}? This can't be undone.`))
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/yarns/${yarn.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      router.push("/stash");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-muted">Need to fix a typo or count?</p>
        <div className="flex gap-2">
          <button onClick={() => setOpen(true)} className="btn-ghost">
            Edit details
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-full border border-accent-rose/40 bg-white px-4 py-2 text-sm font-medium text-accent-rose transition hover:bg-accent-rose/10"
          >
            Delete
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        patch({
          brand: fd.get("brand"),
          product_line: fd.get("product_line"),
          colorway: fd.get("colorway"),
          dye_lot: fd.get("dye_lot"),
          weight_category: fd.get("weight_category"),
          fiber: fd.get("fiber"),
          yardage: numOrNull(fd.get("yardage")),
          meters: numOrNull(fd.get("meters")),
          skein_weight_grams: numOrNull(fd.get("skein_weight_grams")),
          skeins: Math.max(1, Number(fd.get("skeins") || 1)),
          storage_location_id: strOrNull(fd.get("storage_location_id")),
          notes: strOrNull(fd.get("notes")),
        });
      }}
      className="card grad-border space-y-5 p-6"
    >
      <p className="font-display text-2xl">Edit skein</p>
      <Row>
        <Field name="brand" label="Brand" defaultValue={yarn.brand} />
        <Field
          name="product_line"
          label="Product line"
          defaultValue={yarn.productLine}
        />
      </Row>
      <Row>
        <Field name="colorway" label="Colorway" defaultValue={yarn.colorway} />
        <Field name="dye_lot" label="Dye lot" defaultValue={yarn.dyeLot} />
      </Row>
      <Row>
        <Select
          name="weight_category"
          label="Weight"
          options={WEIGHTS}
          defaultValue={yarn.weight}
        />
        <Field name="fiber" label="Fiber" defaultValue={yarn.fiber} />
      </Row>
      <Row>
        <Field
          name="yardage"
          label="Yardage / skein"
          type="number"
          defaultValue={String(yarn.yardage)}
        />
        <Field
          name="meters"
          label="Meters / skein"
          type="number"
          defaultValue={String(yarn.meters)}
        />
      </Row>
      <Row>
        <Field
          name="skein_weight_grams"
          label="Skein weight (g)"
          type="number"
          defaultValue={String(yarn.skeinGrams)}
        />
        <Field
          name="skeins"
          label="Skeins"
          type="number"
          defaultValue={String(yarn.skeins)}
        />
      </Row>
      <label className="block text-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Storage location
        </span>
        <select
          name="storage_location_id"
          defaultValue={yarn.locationId ?? ""}
          className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
        >
          <option value="">— None —</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Notes
        </span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={yarn.notes ?? ""}
          placeholder="Anything to remember about this skein…"
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
        />
      </label>

      {error && (
        <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="btn-grad disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}
