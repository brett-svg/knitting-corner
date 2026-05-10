"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Pattern } from "@/lib/mock";
import { RegenerateCoverButton } from "@/components/RegenerateCoverButton";

const WEIGHTS = [
  "Lace",
  "Fingering",
  "Sport",
  "DK",
  "Worsted",
  "Aran",
  "Bulky",
];

export function PatternEditor({ pattern }: { pattern: Pattern }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        name: String(fd.get("name") ?? "").trim(),
        designer: strOrNull(fd.get("designer")),
        external_url: strOrNull(fd.get("external_url")),
        yarn_weight: strOrNull(fd.get("yarn_weight")),
        required_yardage: numOrNull(fd.get("required_yardage")),
        needle_size: strOrNull(fd.get("needle_size")),
        notes: strOrNull(fd.get("notes")),
        gauge: strOrNull(fd.get("gauge")),
        sizes: strOrNull(fd.get("sizes")),
        construction: strOrNull(fd.get("construction")),
        techniques: strOrNull(fd.get("techniques")),
        garment_type: strOrNull(fd.get("garment_type")),
        recommended_yarn: strOrNull(fd.get("recommended_yarn")),
      };
      if (!payload.name) throw new Error("Name is required");
      const res = await fetch(`/api/patterns/${pattern.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        `Delete "${pattern.name}"? PDF and cover will be removed too. This can't be undone.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/patterns/${pattern.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      router.push("/patterns");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Need to fix a typo or add notes?</p>
          <div className="flex gap-2">
            <button onClick={() => setOpen(true)} className="btn-ghost">
              Edit pattern
            </button>
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-full border border-accent-rose/40 bg-white px-4 py-2 text-sm font-medium text-accent-rose transition hover:bg-accent-rose/10"
            >
              Delete
            </button>
          </div>
        </div>
        {pattern.pdfPath && (
          <div className="border-t border-border pt-3">
            <RegenerateCoverButton patternId={pattern.id} />
          </div>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={save} className="card grad-border space-y-5 p-6">
      <p className="font-display text-2xl">Edit pattern</p>
      <Row>
        <Field name="name" label="Name" defaultValue={pattern.name} required />
        <Field
          name="designer"
          label="Designer"
          defaultValue={pattern.designer ?? ""}
        />
      </Row>
      <Field
        name="external_url"
        label="External link"
        type="url"
        defaultValue={pattern.externalUrl ?? ""}
      />
      <Row>
        <label className="block text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Yarn weight
          </span>
          <select
            name="yarn_weight"
            defaultValue={pattern.yarnWeight ?? ""}
            className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
          >
            <option value="">— None —</option>
            {WEIGHTS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <Field
          name="required_yardage"
          label="Required yardage"
          type="number"
          defaultValue={pattern.requiredYardage?.toString() ?? ""}
        />
      </Row>
      <Row>
        <Field
          name="needle_size"
          label="Needle size"
          defaultValue={pattern.needleSize ?? ""}
        />
        <Field
          name="garment_type"
          label="Garment type"
          defaultValue={pattern.garmentType ?? ""}
        />
      </Row>
      <Field
        name="gauge"
        label="Gauge"
        defaultValue={pattern.gauge ?? ""}
      />
      <Field
        name="sizes"
        label="Sizes"
        defaultValue={pattern.sizes ?? ""}
      />
      <Field
        name="construction"
        label="Construction"
        defaultValue={pattern.construction ?? ""}
      />
      <Field
        name="techniques"
        label="Techniques"
        defaultValue={pattern.techniques ?? ""}
      />
      <Field
        name="recommended_yarn"
        label="Recommended yarn"
        defaultValue={pattern.recommendedYarn ?? ""}
      />
      <label className="block text-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Notes
        </span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={pattern.notes ?? ""}
          placeholder="Anything to remember when you start…"
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
        />
      </label>

      {error && (
        <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="btn-grad disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid items-end gap-4 md:grid-cols-2">{children}</div>;
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        required={required}
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
      />
    </label>
  );
}

function strOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}
function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
