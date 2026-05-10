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

export default function NewPatternPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
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
      </header>

      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <Row>
          <Field name="name" label="Name" required placeholder="Featherweight Cardigan" />
          <Field name="designer" label="Designer" placeholder="Hannah Fettig" />
        </Row>

        <Field
          name="external_url"
          label="External link (optional)"
          type="url"
          placeholder="https://www.ravelry.com/…"
        />

        <label className="block text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            PDF (optional)
          </span>
          <div
            className={clsx(
              "mt-1.5 flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-tint/40 px-4 py-3 text-sm",
              pdf && "border-solid border-accent-lavender/60 bg-white"
            )}
          >
            <span className="truncate text-muted">
              {pdf ? pdf.name : "Upload a PDF — kept private to your account"}
            </span>
            <label className="btn-ghost cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              />
              {pdf ? "Replace" : "Choose file"}
            </label>
          </div>
        </label>

        <Row>
          <Select name="yarn_weight" label="Yarn weight" options={["", ...WEIGHTS]} />
          <Field
            name="required_yardage"
            label="Required yardage"
            type="number"
            placeholder="1300"
          />
        </Row>

        <Field name="needle_size" label="Needle size" placeholder="US 4 (3.5mm)" />

        <label className="block text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Notes
          </span>
          <textarea
            name="notes"
            rows={3}
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
          <button type="submit" disabled={busy} className="btn-grad disabled:opacity-60">
            {busy ? "Saving…" : "Save pattern"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
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
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: string[];
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <select
        name={name}
        defaultValue=""
        className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "—"}
          </option>
        ))}
      </select>
    </label>
  );
}
