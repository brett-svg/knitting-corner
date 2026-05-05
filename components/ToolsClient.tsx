"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Hook, Needle, Notion, StorageLocation } from "@/lib/mock";

type Tab = "needles" | "hooks" | "notions" | "locations";

export function ToolsClient({
  needles,
  hooks,
  notions,
  locations,
}: {
  needles: Needle[];
  hooks: Hook[];
  notions: Notion[];
  locations: StorageLocation[];
}) {
  const [tab, setTab] = useState<Tab>("needles");
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Toolkit
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">
            Your <span className="italic text-grad">tools</span>
          </h1>
          <p className="mt-2 text-muted">
            {needles.length} needle set{needles.length === 1 ? "" : "s"} ·{" "}
            {hooks.length} hook{hooks.length === 1 ? "" : "s"} ·{" "}
            {notions.length} notion{notions.length === 1 ? "" : "s"} ·{" "}
            {locations.length} location{locations.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className={adding ? "btn-ghost" : "btn-grad"}
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["needles", "hooks", "notions", "locations"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setAdding(false);
            }}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition",
              tab === t
                ? "bg-grad-signature text-white shadow-glow"
                : "border border-border bg-white/70 text-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {adding && <AddForm kind={tab} onDone={() => setAdding(false)} />}

      {tab === "needles" && <NeedlesTable rows={needles} />}
      {tab === "hooks" && <HooksTable rows={hooks} />}
      {tab === "notions" && <NotionsTable rows={notions} />}
      {tab === "locations" && <LocationsTable rows={locations} />}
    </div>
  );
}

function AddForm({ kind, onDone }: { kind: Tab; onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    let url = "/api/tools";
    let payload: Record<string, unknown>;
    if (kind === "locations") {
      url = "/api/locations";
      payload = { name: fd.get("name") };
    } else {
      payload = {
        kind:
          kind === "needles" ? "needle" : kind === "hooks" ? "hook" : "notion",
        quantity: fd.get("quantity") || 1,
      };
      if (kind === "needles") {
        payload.sizeUs = fd.get("sizeUs");
        payload.sizeMm = fd.get("sizeMm");
        payload.type = fd.get("type");
        payload.lengthCm = fd.get("lengthCm");
        payload.material = fd.get("material");
      } else if (kind === "hooks") {
        payload.sizeUs = fd.get("sizeUs");
        payload.sizeMm = fd.get("sizeMm");
        payload.material = fd.get("material");
      } else {
        payload.name = fd.get("name");
      }
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grad-border space-y-4 p-5">
      {kind === "needles" && (
        <>
          <Row>
            <Field name="sizeUs" label="Size (US)" placeholder="US 6" />
            <Field name="sizeMm" label="Size (mm)" placeholder="4.0" />
          </Row>
          <Row>
            <Select
              name="type"
              label="Type"
              options={["", "circular", "dpn", "interchangeable", "straight"]}
            />
            <Field name="lengthCm" label="Length (cm)" placeholder="80" />
          </Row>
          <Row>
            <Field name="material" label="Material" placeholder="Wood" />
            <Field name="quantity" label="Quantity" placeholder="1" />
          </Row>
        </>
      )}
      {kind === "hooks" && (
        <>
          <Row>
            <Field name="sizeUs" label="Size (US)" placeholder="H/8" />
            <Field name="sizeMm" label="Size (mm)" placeholder="5.0" />
          </Row>
          <Row>
            <Field name="material" label="Material" placeholder="Aluminum" />
            <Field name="quantity" label="Quantity" placeholder="1" />
          </Row>
        </>
      )}
      {kind === "notions" && (
        <Row>
          <Field name="name" label="Name" required placeholder="Stitch markers" />
          <Field name="quantity" label="Quantity" placeholder="1" />
        </Row>
      )}
      {kind === "locations" && (
        <Field name="name" label="Name" required placeholder="Bin A · Top shelf" />
      )}

      {error && (
        <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="btn-grad disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function NeedlesTable({ rows }: { rows: Needle[] }) {
  if (rows.length === 0) return <Empty msg="No needles yet." />;
  return (
    <div className="card overflow-hidden">
      <Header cols={["Size", "Type", "Length", "Material", "Qty"]} />
      <ul className="divide-y divide-border">
        {rows.map((n) => (
          <li
            key={n.id}
            className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.6fr] items-center gap-3 px-5 py-3"
          >
            <span className="font-display">
              {n.sizeUs ?? "—"}{" "}
              <span className="text-muted">
                {n.sizeMm ? `· ${n.sizeMm}mm` : ""}
              </span>
            </span>
            <span className="text-sm capitalize text-muted">{n.type ?? "—"}</span>
            <span className="text-sm text-muted">
              {n.lengthCm ? `${n.lengthCm} cm` : "—"}
            </span>
            <span className="text-sm text-muted">{n.material ?? "—"}</span>
            <span className="text-right text-sm">×{n.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HooksTable({ rows }: { rows: Hook[] }) {
  if (rows.length === 0) return <Empty msg="No hooks yet." />;
  return (
    <div className="card overflow-hidden">
      <Header cols={["Size", "Material", "Qty"]} />
      <ul className="divide-y divide-border">
        {rows.map((h) => (
          <li
            key={h.id}
            className="grid grid-cols-[1.4fr_1.4fr_0.6fr] items-center gap-3 px-5 py-3"
          >
            <span className="font-display">
              {h.sizeUs ?? "—"}{" "}
              <span className="text-muted">
                {h.sizeMm ? `· ${h.sizeMm}mm` : ""}
              </span>
            </span>
            <span className="text-sm text-muted">{h.material ?? "—"}</span>
            <span className="text-right text-sm">×{h.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotionsTable({ rows }: { rows: Notion[] }) {
  if (rows.length === 0) return <Empty msg="No notions yet." />;
  return (
    <div className="card overflow-hidden">
      <Header cols={["Name", "Qty"]} />
      <ul className="divide-y divide-border">
        {rows.map((n) => (
          <li
            key={n.id}
            className="grid grid-cols-[1fr_0.4fr] items-center gap-3 px-5 py-3"
          >
            <span className="font-display">{n.name}</span>
            <span className="text-right text-sm">×{n.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LocationsTable({ rows }: { rows: StorageLocation[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (rows.length === 0)
    return (
      <Empty msg="No locations yet — add one to start organizing your stash." />
    );

  async function rename(id: string) {
    if (!draft.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/locations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: draft }),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(null);
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this location? Yarn previously stored there will lose the label.")) return;
    setBusy(true);
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <Header cols={["Name", "Actions"]} />
      <ul className="divide-y divide-border">
        {rows.map((l) => (
          <li
            key={l.id}
            className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3"
          >
            {editing === l.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename(l.id);
                  if (e.key === "Escape") setEditing(null);
                }}
                onBlur={() => rename(l.id)}
                className="rounded-lg border border-border bg-white px-2 py-1 text-sm focus:border-accent-lavender outline-none"
              />
            ) : (
              <span className="font-display">{l.name}</span>
            )}
            <span className="flex justify-end gap-2 text-xs">
              <button
                disabled={busy}
                onClick={() => {
                  setEditing(l.id);
                  setDraft(l.name);
                }}
                className="rounded-full border border-border px-3 py-1 text-muted hover:text-ink"
              >
                Rename
              </button>
              <button
                disabled={busy}
                onClick={() => remove(l.id)}
                className="rounded-full border border-accent-rose/40 px-3 py-1 text-accent-rose hover:bg-accent-rose/10"
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Header({ cols }: { cols: string[] }) {
  const grid =
    cols.length === 5
      ? "grid-cols-[1.4fr_1fr_1fr_1fr_0.6fr]"
      : cols.length === 3
        ? "grid-cols-[1.4fr_1.4fr_0.6fr]"
        : cols[1] === "Actions"
          ? "grid-cols-[1fr_auto]"
          : "grid-cols-[1fr_0.4fr]";
  return (
    <div
      className={`grid ${grid} border-b border-border bg-tint/40 px-5 py-2.5 text-[11px] uppercase tracking-wider text-muted`}
    >
      {cols.map((c, i) => (
        <span key={c} className={clsx(i === cols.length - 1 && "text-right")}>
          {c}
        </span>
      ))}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-12 text-center">
      <div className="h-10 w-10 rounded-full bg-grad-cool opacity-70" />
      <p className="text-sm text-muted">{msg}</p>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
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
        placeholder={placeholder}
        required={required}
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
