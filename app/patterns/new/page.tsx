"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

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
  name: string;
  designer: string;
  external_url: string;
  yarn_weight: string;
  required_yardage: string;
  needle_size: string;
  gauge: string;
  sizes: string;
  construction: string;
  techniques: string;
  garment_type: string;
  recommended_yarn: string;
  notes: string;
};

const EMPTY: Form = {
  name: "",
  designer: "",
  external_url: "",
  yarn_weight: "",
  required_yardage: "",
  needle_size: "",
  gauge: "",
  sizes: "",
  construction: "",
  techniques: "",
  garment_type: "",
  recommended_yarn: "",
  notes: "",
};

export default function NewPatternPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedAt, setExtractedAt] = useState<string | null>(null);

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onPdf(file: File | null) {
    setPdf(file);
    if (!file) return;
    // Auto-extract immediately on upload — instant gratification
    void extractFrom(file);
  }

  async function extractFrom(file: File) {
    setExtracting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("pdf", file);
      const res = await fetch("/api/patterns/extract-from-pdf", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Extraction failed");
      const e = json.extracted as Record<string, unknown>;
      setForm((f) => ({
        ...f,
        name: (e.name as string) || f.name,
        designer: (e.designer as string) || f.designer,
        yarn_weight: (e.yarn_weight as string) || f.yarn_weight,
        required_yardage:
          e.required_yardage != null
            ? String(e.required_yardage)
            : f.required_yardage,
        needle_size: (e.needle_size as string) || f.needle_size,
        gauge: (e.gauge as string) || f.gauge,
        sizes: (e.sizes as string) || f.sizes,
        construction: (e.construction as string) || f.construction,
        techniques: (e.techniques as string) || f.techniques,
        garment_type: (e.garment_type as string) || f.garment_type,
        recommended_yarn:
          (e.recommended_yarn as string) || f.recommended_yarn,
        notes: (e.notes as string) || f.notes,
      }));
      setExtractedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) {
        if (v) fd.set(k, v);
      }
      if (pdf) fd.set("pdf", pdf);
      const res = await fetch("/api/patterns", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      router.push(`/patterns/${json.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Library
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">
          New <span className="italic text-grad">pattern</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Upload a PDF and we'll auto-fill what we can. You can review and
          tweak before saving.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <label className="block text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            PDF (recommended)
          </span>
          <div
            className={clsx(
              "mt-1.5 flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-tint/40 px-4 py-3 text-sm",
              pdf && "border-solid border-accent-lavender/60 bg-white"
            )}
          >
            <span className="truncate text-muted">
              {extracting
                ? `Reading ${pdf?.name ?? "PDF"}…`
                : pdf
                  ? pdf.name
                  : "Upload a PDF — kept private to your account"}
            </span>
            <label className="btn-ghost cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => onPdf(e.target.files?.[0] ?? null)}
              />
              {pdf ? "Replace" : "Choose file"}
            </label>
          </div>
          {extractedAt && !extracting && (
            <p className="mt-1 text-xs text-muted">
              Auto-filled at {extractedAt} — review below before saving.
            </p>
          )}
        </label>

        <Row>
          <Field
            label="Name"
            value={form.name}
            onChange={(v) => update("name", v)}
            placeholder="Camilla Sweater"
            required
          />
          <Field
            label="Designer"
            value={form.designer}
            onChange={(v) => update("designer", v)}
            placeholder="HipKnitShop"
          />
        </Row>

        <Field
          label="External link (optional)"
          type="url"
          value={form.external_url}
          onChange={(v) => update("external_url", v)}
          placeholder="https://www.ravelry.com/…"
        />

        <Row>
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Yarn weight
            </span>
            <select
              value={form.yarn_weight}
              onChange={(e) => update("yarn_weight", e.target.value)}
              className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
            >
              <option value="">— None —</option>
              {WEIGHTS.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <Field
            label="Required yardage"
            type="number"
            value={form.required_yardage}
            onChange={(v) => update("required_yardage", v)}
            placeholder="1300"
          />
        </Row>

        <Row>
          <Field
            label="Needle size"
            value={form.needle_size}
            onChange={(v) => update("needle_size", v)}
            placeholder="US 7 (4.5mm)"
          />
          <Field
            label="Garment type"
            value={form.garment_type}
            onChange={(v) => update("garment_type", v)}
            placeholder="sweater, hat, shawl…"
          />
        </Row>

        <Field
          label="Gauge"
          value={form.gauge}
          onChange={(v) => update("gauge", v)}
          placeholder="22 sts × 30 rows = 4 inches in stockinette"
        />

        <Field
          label="Sizes"
          value={form.sizes}
          onChange={(v) => update("sizes", v)}
          placeholder="XS (S) M (L) XL (2XL-3XL)"
        />

        <Field
          label="Construction"
          value={form.construction}
          onChange={(v) => update("construction", v)}
          placeholder="top-down raglan"
        />

        <Field
          label="Techniques"
          value={form.techniques}
          onChange={(v) => update("techniques", v)}
          placeholder="short rows, V-neck, raglan increases"
        />

        <Field
          label="Recommended yarn"
          value={form.recommended_yarn}
          onChange={(v) => update("recommended_yarn", v)}
          placeholder="12 skeins of Hip Wool"
        />

        <label className="block text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Notes
          </span>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Anything to remember when you start…"
            className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
          />
        </label>

        {error && (
          <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || extracting}
            className="btn-grad disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save pattern"}
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
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
      />
    </label>
  );
}
