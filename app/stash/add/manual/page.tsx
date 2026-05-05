export default function ManualAddPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Manual entry
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">
          New <span className="italic text-grad">skein</span>
        </h1>
      </header>

      <form className="card space-y-5 p-6">
        <Row>
          <Field label="Brand" placeholder="e.g. Malabrigo" />
          <Field label="Product line" placeholder="e.g. Rios" />
        </Row>
        <Row>
          <Field label="Colorway" placeholder="e.g. Aniversario" />
          <Field label="Dye lot" placeholder="0823" />
        </Row>
        <Row>
          <Select
            label="Weight"
            options={[
              "Lace",
              "Fingering",
              "Sport",
              "DK",
              "Worsted",
              "Aran",
              "Bulky",
            ]}
          />
          <Field label="Fiber" placeholder="100% Superwash Merino" />
        </Row>
        <Row>
          <Field label="Yardage / skein" placeholder="210" type="number" />
          <Field label="Skein weight (g)" placeholder="100" type="number" />
        </Row>
        <Row>
          <Field label="Skeins" placeholder="4" type="number" />
          <Field label="Storage location" placeholder="Bin A · Top shelf" />
        </Row>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-ghost"
          >
            Cancel
          </button>
          <button type="submit" className="btn-grad" disabled>
            Save skein
          </button>
        </div>
        <p className="text-xs text-muted">
          Wiring up persistence in Phase 2 — this form is the shape we'll save.
        </p>
      </form>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
      />
    </label>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <select className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
