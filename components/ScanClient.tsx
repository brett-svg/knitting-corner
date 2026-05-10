"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Pattern, StorageLocation } from "@/lib/mock";
import { SkeinStepper } from "@/components/SkeinStepper";
import { PatternCard } from "@/components/PatternCard";

type Label = {
  brand: string | null;
  product_line: string | null;
  fiber: string | null;
  weight_category: string | null;
  yardage: number | null;
  meters: number | null;
  skein_weight_grams: number | null;
  colorway: string | null;
  dye_lot: string | null;
  needle_size: string | null;
};

type Phase = "capture" | "processing" | "review" | "saved";

type Duplicate = {
  id: string;
  brand: string | null;
  productLine: string | null;
  colorway: string | null;
  dyeLot: string | null;
  skeins: number;
  swatch: string | null;
  imageUrl: string | null;
};

export function ScanClient({
  locations,
  patterns,
}: {
  locations: StorageLocation[];
  patterns: Pattern[];
}) {
  const [phase, setPhase] = useState<Phase>("capture");
  const [images, setImages] = useState<string[]>([]);
  const [label, setLabel] = useState<Label | null>(null);
  const [mocked, setMocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smart defaults that survive across "Add another" loops
  const [defaultLocation, setDefaultLocation] = useState<string>("");
  const [defaultSkeins, setDefaultSkeins] = useState<number>(1);

  // Last save state used to drive the success screen
  const [savedLabel, setSavedLabel] = useState<Label | null>(null);
  const [savedSkeins, setSavedSkeins] = useState<number>(1);

  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError(null);
    try {
      const dataUrls = await Promise.all(
        files.map((f) => compressToDataUrl(f, 1280, 0.82))
      );
      setImages((prev) => [...prev, ...dataUrls].slice(0, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read image");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function process() {
    if (!images.length) return;
    setPhase("processing");
    setError(null);
    try {
      const res = await fetch("/api/scan-yarn-label", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ images }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Scan failed");
      const json = (await res.json()) as { label: Label; mocked: boolean };
      setLabel(json.label);
      setMocked(json.mocked);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setPhase("capture");
    }
  }

  function reset(resetDefaults = false) {
    setImages([]);
    setLabel(null);
    setError(null);
    setPhase("capture");
    if (resetDefaults) {
      setDefaultLocation("");
      setDefaultSkeins(1);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Scan label
        </p>
        <h1 className="mt-1 font-display text-5xl tracking-tight">
          Point at the <span className="italic text-grad">ball band</span>
        </h1>
        <p className="mt-2 text-muted">
          One photo of the front works; adding the back makes fiber & yardage
          much more accurate.{" "}
          <Link href="/stash/add/manual" className="underline hover:text-ink">
            Or enter by hand →
          </Link>
        </p>
      </header>

      {phase === "capture" && (
        <section className="space-y-6">
          <label
            htmlFor="picker"
            className="card grad-border flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 p-8 text-center transition hover:shadow-glow"
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-grad-signature text-white shadow-glow">
              <CameraIcon />
            </div>
            <p className="font-display text-2xl">
              {images.length ? "Add another photo" : "Take a photo"}
            </p>
            <p className="text-sm text-muted">
              Or pick from your library — up to 2 images
            </p>
            <input
              id="picker"
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={onPick}
              className="sr-only"
            />
          </label>

          {images.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {images.map((src, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Capture ${i + 1}`}
                      className="aspect-square w-full rounded-2xl border border-border object-cover"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white shadow-soft transition hover:bg-black/75"
                    >
                      ×
                    </button>
                    <span className="absolute bottom-2 left-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink">
                      {i === 0 ? "Front" : "Back"}
                    </span>
                  </div>
                ))}
              </div>
              {images.length < 2 && (
                <p className="text-center text-xs text-muted">
                  Tip: snap the back of the band too — it usually has yardage
                  and fiber.
                </p>
              )}
              <div className="flex items-center justify-between">
                <button onClick={() => reset()} className="btn-ghost">
                  Start over
                </button>
                <button onClick={process} className="btn-grad">
                  Extract details →
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
              {error}
            </p>
          )}
        </section>
      )}

      {phase === "processing" && (
        <section className="card flex flex-col items-center gap-5 p-12 text-center">
          <ShimmerOrb />
          <p className="font-display text-2xl">Reading the label…</p>
          <p className="max-w-sm text-sm text-muted">
            Pulling brand, fiber, weight, yardage and colorway. Usually 2–4
            seconds.
          </p>
        </section>
      )}

      {phase === "review" && label && (
        <Review
          label={label}
          images={images}
          mocked={mocked}
          locations={locations}
          defaultLocation={defaultLocation}
          defaultSkeins={defaultSkeins}
          onCancel={() => reset()}
          onSaved={(savedSk, savedLabel, savedLocation) => {
            setSavedSkeins(savedSk);
            setSavedLabel(savedLabel);
            setDefaultLocation(savedLocation);
            setDefaultSkeins(savedSk);
            setPhase("saved");
          }}
        />
      )}

      {phase === "saved" && savedLabel && (
        <Saved
          label={savedLabel}
          skeins={savedSkeins}
          patterns={patterns}
          onAddAnother={() => reset()}
        />
      )}
    </div>
  );
}

function Review({
  label,
  images,
  mocked,
  locations,
  defaultLocation,
  defaultSkeins,
  onCancel,
  onSaved,
}: {
  label: Label;
  images: string[];
  mocked: boolean;
  locations: StorageLocation[];
  defaultLocation: string;
  defaultSkeins: number;
  onCancel: () => void;
  onSaved: (skeins: number, label: Label, location: string) => void;
}) {
  const [form, setForm] = useState(label);
  const [skeins, setSkeins] = useState(defaultSkeins);
  const [locationId, setLocationId] = useState<string>(defaultLocation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);

  function update<K extends keyof Label>(k: K, v: Label[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(force = false) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/yarns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: form,
          skeins,
          images,
          locationId: locationId || null,
          force,
        }),
      });
      if (res.status === 409) {
        const json = (await res.json()) as {
          duplicate: Duplicate;
          incomingSkeins: number;
        };
        setDuplicate(json.duplicate);
        return;
      }
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      onSaved(skeins, form, locationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function mergeIntoExisting() {
    if (!duplicate) return;
    setSaving(true);
    setError(null);
    try {
      const newSkeins = duplicate.skeins + skeins;
      const res = await fetch(`/api/yarns/${duplicate.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skeins: newSkeins }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Merge failed");
      onSaved(skeins, form, locationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      {mocked && (
        <p className="rounded-xl border border-accent-violet/40 bg-accent-violet/10 px-4 py-3 text-sm text-ink">
          ⓘ No <code className="font-mono text-xs">ANTHROPIC_API_KEY</code>{" "}
          set — this is sample data so you can see the flow.
        </p>
      )}

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
            <button
              onClick={mergeIntoExisting}
              disabled={saving}
              className="btn-grad disabled:opacity-60"
            >
              {saving
                ? "Working…"
                : `Add ${skeins} to existing → ${duplicate.skeins + skeins} total`}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="btn-ghost"
            >
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

      <div className="card space-y-5 p-6">
        <Row>
          <Field label="Brand" value={form.brand ?? ""} onChange={(v) => update("brand", v)} />
          <Field label="Product line" value={form.product_line ?? ""} onChange={(v) => update("product_line", v)} />
        </Row>
        <Row>
          <Field label="Colorway" value={form.colorway ?? ""} onChange={(v) => update("colorway", v)} />
          <Field label="Dye lot" value={form.dye_lot ?? ""} onChange={(v) => update("dye_lot", v)} />
        </Row>
        <Row>
          <Field label="Weight" value={form.weight_category ?? ""} onChange={(v) => update("weight_category", v)} />
          <Field label="Fiber" value={form.fiber ?? ""} onChange={(v) => update("fiber", v)} />
        </Row>
        <Row>
          <Field
            label="Yardage / skein"
            type="number"
            value={form.yardage?.toString() ?? ""}
            onChange={(v) => update("yardage", v ? Number(v) : null)}
          />
          <Field
            label="Meters / skein"
            type="number"
            value={form.meters?.toString() ?? ""}
            onChange={(v) => update("meters", v ? Number(v) : null)}
          />
        </Row>
        <Row>
          <Field
            label="Skein weight (g)"
            type="number"
            value={form.skein_weight_grams?.toString() ?? ""}
            onChange={(v) => update("skein_weight_grams", v ? Number(v) : null)}
          />
          <SkeinStepper value={skeins} onChange={setSkeins} />
        </Row>
        <LocationSelect
          locations={locations}
          value={locationId}
          onChange={setLocationId}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="btn-ghost">
          Re-scan
        </button>
        <button
          onClick={() => save(false)}
          disabled={saving || !!duplicate}
          className="btn-grad disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save to stash"}
        </button>
      </div>
    </section>
  );
}

function Saved({
  label,
  skeins,
  patterns,
  onAddAnother,
}: {
  label: Label;
  skeins: number;
  patterns: Pattern[];
  onAddAnother: () => void;
}) {
  const totalYards = (label.yardage ?? 0) * skeins;
  const matches = patterns
    .filter((p) => {
      if (p.yarnWeight && p.yarnWeight !== label.weight_category) return false;
      if (p.requiredYardage && totalYards < p.requiredYardage) return false;
      return true;
    })
    .slice(0, 4);

  return (
    <section className="space-y-6">
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <div className="h-12 w-12 rounded-full bg-grad-cool" />
        <p className="font-display text-3xl">Added to your stash</p>
        <p className="text-sm text-muted">
          {skeins} × {label.brand ?? "yarn"}
          {label.colorway && ` in ${label.colorway}`}
          {totalYards ? ` · ${totalYards.toLocaleString()} yds total` : ""}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button onClick={onAddAnother} className="btn-grad">
            Scan another
          </button>
          <Link href="/stash" className="btn-ghost">
            View stash
          </Link>
        </div>
      </div>

      {matches.length > 0 && (
        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              What you could make with this
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-tight">
              {matches.length} pattern{matches.length === 1 ? "" : "s"}{" "}
              <span className="italic text-grad">in your library</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {matches.map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        </section>
      )}
    </section>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
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
        className={clsx(
          "mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition",
          "placeholder:text-muted/70 focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
        )}
      />
    </label>
  );
}

export function LocationSelect({
  locations,
  value,
  onChange,
}: {
  locations: StorageLocation[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        Storage location
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent-lavender focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)]"
      >
        <option value="">— None —</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      {locations.length === 0 && (
        <span className="mt-1 block text-xs text-muted">
          Add locations on the{" "}
          <Link href="/tools" className="underline hover:text-ink">
            Tools page
          </Link>
          .
        </span>
      )}
    </label>
  );
}

function ShimmerOrb() {
  return (
    <span
      className="block h-16 w-16 animate-shimmer rounded-full"
      style={{
        background:
          "linear-gradient(110deg, #FF7AD9, #C084FC, #60A5FA, #5EEAD4, #FF7AD9)",
        backgroundSize: "200% 100%",
        boxShadow: "0 10px 40px -10px rgba(192,132,252,0.6)",
      }}
    />
  );
}

async function compressToDataUrl(
  file: File,
  maxEdge = 1280,
  quality = 0.82
): Promise<string> {
  let source: ImageBitmap | HTMLImageElement | null = await createImageBitmap(
    file
  ).catch(() => null);

  if (!source) {
    source = await loadViaImage(file).catch(() => null);
  }

  if (!source) {
    throw new Error(
      `Couldn't read this image (${file.type || "unknown type"}). ` +
        "Try a JPEG or PNG — iPhones may need 'Camera → Formats → Most Compatible'."
    );
  }

  const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

function loadViaImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

function CameraIcon() {
  return (
    <svg
      width="22"
      height="22"
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
