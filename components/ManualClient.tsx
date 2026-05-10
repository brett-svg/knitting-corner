"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StorageLocation } from "@/lib/mock";
import { SkeinStepper } from "@/components/SkeinStepper";
import { LocationSelect } from "@/components/ScanClient";

const WEIGHTS = [
  "Lace",
  "Fingering",
  "Sport",
  "DK",
  "Worsted",
  "Aran",
  "Bulky",
];

type Form = {
  brand: string;
  product_line: string;
  colorway: string;
  dye_lot: string;
  weight_category: string;
  fiber: string;
  yardage: string;
  meters: string;
  skein_weight_grams: string;
  needle_size: string;
};

const EMPTY: Form = {
  brand: "",
  product_line: "",
  colorway: "",
  dye_lot: "",
  weight_category: "",
  fiber: "",
  yardage: "",
  meters: "",
  skein_weight_grams: "",
  needle_size: "",
};

type Duplicate = {
  id: string;
  brand: string | null;
  productLine: string | null;
  colorway: string | null;
  dyeLot: string | null;
  skeins: number;
};

export function ManualClient({ locations }: { locations: StorageLocation[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [skeins, setSkeins] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function buildLabel() {
    return {
      brand: form.brand.trim() || null,
      product_line: form.product_line.trim() || null,
      colorway: form.colorway.trim() || null,
      dye_lot: form.dye_lot.trim() || null,
      weight_category: form.weight_category || null,
      fiber: form.fiber.trim() || null,
      yardage: form.yardage ? Number(form.yardage) : null,
      meters: form.meters ? Number(form.meters) : null,
      skein_weight_grams: form.skein_weight_grams
        ? Number(form.skein_weight_grams)
        : null,
      needle_size: form.needle_size.trim() || null,
    };
  }

  async function save(force = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/yarns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: buildLabel(),
          skeins,
          images: [],
          locationId: locationId || null,
          force,
        }),
      });
      if (res.status === 409) {
        const json = (await res.json()) as { duplicate: Duplicate };
        setDuplicate(json.duplicate);
        return;
      }
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      router.push("/stash");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function mergeIntoExisting() {
    if (!duplicate) return;
    setBusy(true);
    setError(null);
    try {
      const newSkeins = duplicate.skeins + skeins;
      const res = await fetch(`/api/yarns/${duplicate.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skeins: newSkeins }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Merge failed");
      router.push("/stash");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Manual entry
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">
          New <span className="italic text-grad">skein</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          For yarn without a label, or when you want full control.{" "}
          <Link href="/stash/add/scan" className="underline hover:text-ink">
            Or scan a label →
          </Link>
        </p>
      </header>

      {duplicate && (
        <div className="card grad-border space-y-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Looks familiar
            </p>
            <p className="mt-1 font-display text-2xl">
              You already have {duplicate.skeins} of this skein
            </p>
            <p className="mt-1 text-sm text-muted">
              {duplicate.brand} · {duplicate.colorway}
              {duplicate.dyeLot && ` · dye lot ${duplicate.dyeLot}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={mergeIntoExisting} disabled={busy} className="btn-grad disabled:opacity-60">
              {busy
                ? "Working…"
                : `Add ${skeins} to existing → ${duplicate.skeins + skeins} total`}
            </button>
            <button onClick={() => save(true)} disabled={busy} className="btn-ghost">
              Save as separate skein
            </button>
            <button
              type="button"
              onClick={() => setDuplicate(null)}
              className="text-xs text-muted underline hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="card space-y-5 p-6"
      >
        <Row>
          <Field
            label="Brand"
            value={form.brand}
            onChange={(v) => update("brand", v)}
            placeholder="e.g. Malabrigo"
            required
          />
          <Field
            label="Product line"
            value={form.product_line}
            onChange={(v) => update("product_line", v)}
            placeholder="e.g. Rios"
          />
        </Row>
        <Row>
          <Field
            label="Colorway"
            value={form.colorway}
            onChange={(v) => update("colorway", v)}
            placeholder="e.g. Aniversario"
            required
          />
          <Field
            label="Dye lot"
            value={form.dye_lot}
            onChange={(v) => update("dye_lot", v)}
            placeholder="0823"
          />
        </Row>
        <Row>
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Weight
            </span>
            <select
              value={form.weight_category}
              onChange={(e) => update("weight_category", e.target.value)}
              className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
            >
              <option value="">— Pick a weight —</option>
              {WEIGHTS.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <Field
            label="Fiber"
            value={form.fiber}
            onChange={(v) => update("fiber", v)}
            placeholder="100% Superwash Merino"
          />
        </Row>
        <Row>
          <Field
            label="Yardage / skein"
            type="number"
            value={form.yardage}
            onChange={(v) => update("yardage", v)}
            placeholder="210"
          />
          <Field
            label="Skein weight (g)"
            type="number"
            value={form.skein_weight_grams}
            onChange={(v) => update("skein_weight_grams", v)}
            placeholder="100"
          />
        </Row>
        <Row>
          <SkeinStepper value={skeins} onChange={setSkeins} />
          <LocationSelect
            locations={locations}
            value={locationId}
            onChange={setLocationId}
          />
        </Row>

        {error && (
          <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/stash" className="btn-ghost">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={busy || !!duplicate}
            className="btn-grad disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save skein"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid items-end gap-4 md:grid-cols-2">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
      />
    </label>
  );
}
