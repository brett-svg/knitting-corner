"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { StorageLocation, Yarn } from "@/lib/mock";

const WEIGHTS = ["Lace", "Fingering", "Sport", "DK", "Worsted", "Aran", "Bulky"];

// Every editable value is held as a string so inputs stay controlled and an
// empty box is distinguishable from 0. Converted to API shape on save.
type Values = {
  brand: string;
  product_line: string;
  colorway: string;
  fiber: string;
  skeins: string;
  yardage: string;
  meters: string;
  skein_weight_grams: string;
  dye_lot: string;
  weight_category: string;
  storage_location_id: string;
  notes: string;
};

function fromYarn(y: Yarn): Values {
  return {
    brand: y.brand ?? "",
    product_line: y.productLine ?? "",
    colorway: y.colorway ?? "",
    fiber: y.fiber ?? "",
    skeins: String(y.skeins),
    yardage: y.yardage ? String(y.yardage) : "",
    meters: y.meters ? String(y.meters) : "",
    skein_weight_grams: y.skeinGrams ? String(y.skeinGrams) : "",
    dye_lot: y.dyeLot ?? "",
    weight_category: y.weight,
    storage_location_id: y.locationId ?? "",
    notes: y.notes ?? "",
  };
}

function toPayload(key: keyof Values, v: string): unknown {
  const s = v.trim();
  switch (key) {
    case "skeins":
      return Math.max(1, Math.round(Number(s) || 1));
    case "yardage":
    case "meters":
    case "skein_weight_grams": {
      if (!s) return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    case "storage_location_id":
    case "notes":
      return s || null;
    default:
      return s;
  }
}

export function YarnDetails({
  yarn,
  locations,
}: {
  yarn: Yarn;
  locations: StorageLocation[];
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<Values>(() => fromYarn(yarn));
  const [values, setValues] = useState<Values>(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = useMemo(
    () => (Object.keys(values) as (keyof Values)[]).filter((k) => values[k] !== saved[k]),
    [values, saved]
  );
  const dirty = changed.length > 0;
  const isChanged = (k: keyof Values) => values[k] !== saved[k];

  const set = (k: keyof Values) => (v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setError(null);
  };

  // Warn before navigating away with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function discard() {
    setValues(saved);
    setError(null);
  }

  async function save() {
    if (!dirty || busy) return;
    const payload: Record<string, unknown> = {};
    for (const k of changed) payload[k] = toPayload(k, values[k]);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/yarns/${yarn.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      // Normalise what we show to what was stored (e.g. skeins clamped to 1).
      const normalised = { ...values };
      if ("skeins" in payload) normalised.skeins = String(payload.skeins);
      setSaved(normalised);
      setValues(normalised);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${yarn.brand} ${yarn.colorway}? This can't be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/yarns/${yarn.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      router.push("/stash");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  // Enter saves, Escape discards — from any single-line field.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      save();
    } else if (e.key === "Escape" && dirty) {
      e.preventDefault();
      discard();
      (e.target as HTMLElement).blur();
    }
  };

  const total = (Number(values.yardage) || 0) * (Number(values.skeins) || 0);

  return (
    <div className="flex flex-col justify-center" onKeyDown={onKeyDown}>
      <div className="-mx-1 flex flex-wrap items-center text-xs uppercase tracking-[0.18em] text-muted">
        <InlineInput
          value={values.brand}
          onChange={set("brand")}
          changed={isChanged("brand")}
          placeholder="Brand"
          aria-label="Brand"
          className="uppercase tracking-[0.18em]"
        />
        <span aria-hidden>·</span>
        <InlineInput
          value={values.product_line}
          onChange={set("product_line")}
          changed={isChanged("product_line")}
          placeholder="Product line"
          aria-label="Product line"
          className="uppercase tracking-[0.18em]"
        />
      </div>
      <h1 className="-mx-1 mt-1 font-display text-4xl tracking-tight md:text-5xl">
        <InlineInput
          value={values.colorway}
          onChange={set("colorway")}
          changed={isChanged("colorway")}
          placeholder="Colorway"
          aria-label="Colorway"
          className="w-full"
        />
      </h1>
      <p className="-mx-1 mt-2 text-muted">
        <InlineInput
          value={values.fiber}
          onChange={set("fiber")}
          changed={isChanged("fiber")}
          placeholder="Fiber"
          aria-label="Fiber"
          className="w-full"
        />
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SpecInput
          label="Skeins"
          prefix="×"
          type="number"
          min={1}
          value={values.skeins}
          onChange={set("skeins")}
          changed={isChanged("skeins")}
        />
        <SpecInput
          label="Yds / skein"
          suffix="yds"
          type="number"
          value={values.yardage}
          onChange={set("yardage")}
          changed={isChanged("yardage")}
        />
        <SpecInput
          label="Meters / skein"
          suffix="m"
          type="number"
          value={values.meters}
          onChange={set("meters")}
          changed={isChanged("meters")}
        />
        <Spec label="Total" value={`${total.toLocaleString()} yds`} />
        <SpecInput
          label="Skein weight"
          suffix="g"
          type="number"
          value={values.skein_weight_grams}
          onChange={set("skein_weight_grams")}
          changed={isChanged("skein_weight_grams")}
        />
        <SpecInput
          label="Dye lot"
          value={values.dye_lot}
          onChange={set("dye_lot")}
          changed={isChanged("dye_lot")}
        />
        <SpecSelect
          label="Weight"
          value={values.weight_category}
          onChange={set("weight_category")}
          changed={isChanged("weight_category")}
          options={WEIGHTS.map((w) => ({ value: w, label: w }))}
        />
        <SpecSelect
          label="Storage"
          value={values.storage_location_id}
          onChange={set("storage_location_id")}
          changed={isChanged("storage_location_id")}
          options={[
            { value: "", label: "—" },
            ...locations.map((l) => ({ value: l.id, label: l.name })),
          ]}
          className="col-span-2 sm:col-span-2"
        />
      </div>

      <textarea
        value={values.notes}
        onChange={(e) => set("notes")(e.target.value)}
        rows={Math.max(2, values.notes.split("\n").length)}
        placeholder="Add a note about this yarn…"
        aria-label="Notes"
        className={clsx(
          "mt-6 w-full max-w-prose resize-none rounded-xl border bg-white/70 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 hover:border-accent-lavender/50 focus:border-accent-lavender focus:bg-white focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]",
          isChanged("notes") ? "border-accent-lavender" : "border-border"
        )}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/projects/new" className="btn-grad">
          Use in project
        </Link>
        <Link href="/stash" className="btn-ghost">
          ← Back to stash
        </Link>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="ml-auto text-sm text-muted transition hover:text-accent-rose disabled:opacity-60"
        >
          Delete yarn
        </button>
      </div>

      {error && !dirty && (
        <p className="mt-4 rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
          {error}
        </p>
      )}

      {dirty && (
        <div
          role="region"
          aria-label="Unsaved changes"
          className="fixed inset-x-0 z-30 mx-auto flex w-[min(94%,440px)] flex-col gap-2 rounded-2xl border border-border bg-white/95 p-3 shadow-soft backdrop-blur-xl bottom-[calc(max(env(safe-area-inset-bottom),1rem)+4.5rem)] md:bottom-6"
        >
          {error && <p className="px-1 text-sm text-accent-rose">{error}</p>}
          <div className="flex items-center gap-2">
            <p className="flex-1 px-1 text-sm text-muted">
              {changed.length} unsaved change{changed.length === 1 ? "" : "s"}
            </p>
            <button type="button" onClick={discard} disabled={busy} className="btn-ghost px-4 py-2">
              Discard
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="btn-grad px-4 py-2 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Text that looks like plain text until you hover or focus it. Sized to its
// content via a hidden mirror span sharing the same grid cell.
function InlineInput({
  value,
  onChange,
  changed,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  changed: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <span className={clsx("inline-grid max-w-full align-baseline", className)}>
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre px-1">
        {value || rest.placeholder || " "}
      </span>
      <input
        {...rest}
        size={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "col-start-1 row-start-1 w-full min-w-0 rounded-md [text-transform:inherit] bg-transparent px-1 outline-none transition placeholder:text-muted/50 hover:bg-white/70 focus:bg-white focus:shadow-[0_0_0_2px_rgba(192,132,252,0.45)] focus-visible:outline-none",
          changed && "bg-accent-lavender/10"
        )}
      />
    </span>
  );
}

const tileClass = (changed: boolean, className?: string) =>
  clsx(
    "rounded-xl border bg-white/70 px-3 py-2 transition focus-within:border-accent-lavender focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(192,132,252,0.15)] hover:border-accent-lavender/50",
    changed ? "border-accent-lavender" : "border-border",
    className
  );

function SpecInput({
  label,
  value,
  onChange,
  changed,
  prefix,
  suffix,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  changed: boolean;
  prefix?: string;
  suffix?: string;
  type?: "text" | "number";
  min?: number;
}) {
  return (
    <label className={clsx(tileClass(changed), "block cursor-text")}>
      <span className="block text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className="mt-0.5 flex items-baseline gap-1 font-display text-base">
        {prefix && <span className="text-muted">{prefix}</span>}
        <input
          type={type}
          inputMode={type === "number" ? "numeric" : undefined}
          min={min}
          value={value}
          placeholder="—"
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent outline-none focus-visible:outline-none placeholder:text-muted/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && value && <span className="shrink-0 text-sm text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

function SpecSelect({
  label,
  value,
  onChange,
  changed,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  changed: boolean;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={clsx(tileClass(changed, className), "block cursor-pointer")}>
      <span className="block text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className="mt-0.5 block font-display text-base">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none truncate bg-transparent outline-none focus-visible:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-white/40 px-3 py-2">
      <span className="block text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className="mt-0.5 block truncate font-display text-base">{value}</span>
    </div>
  );
}
