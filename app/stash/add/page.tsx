import Link from "next/link";

export default function AddYarnPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Add to stash
        </p>
        <h1 className="mt-1 font-display text-5xl tracking-tight">
          How would you like to <span className="italic text-grad">add it</span>?
        </h1>
        <p className="mt-3 text-muted">
          Scanning is fastest — point your camera at the label and we'll fill in
          the rest.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/stash/add/scan"
          className="card grad-border group relative flex aspect-square flex-col items-start justify-between p-6 text-left transition hover:-translate-y-0.5 hover:shadow-glow"
        >
          <span className="chip">Recommended</span>
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-grad-signature text-white shadow-glow">
              <CameraIcon />
            </div>
            <p className="font-display text-2xl tracking-tight">Scan label</p>
            <p className="mt-1 text-sm text-muted">
              Take 1–2 photos. We'll extract brand, fiber, weight, yardage and
              colorway.
            </p>
          </div>
          <p className="text-xs text-muted">Open camera →</p>
        </Link>

        <Link
          href="/stash/add/manual"
          className="card group relative flex aspect-square flex-col items-start justify-between p-6 text-left transition hover:-translate-y-0.5 hover:shadow-soft"
        >
          <span className="chip">Manual</span>
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-ink">
              <PlusIcon />
            </div>
            <p className="font-display text-2xl tracking-tight">
              Enter by hand
            </p>
            <p className="mt-1 text-sm text-muted">
              For yarn without a label, or when you want full control.
            </p>
          </div>
          <p className="text-xs text-muted">Open form →</p>
        </Link>
      </div>

      <div className="card p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Tip</p>
        <p className="mt-2 font-display text-xl">
          Scanning the back label too gives much better fiber & yardage
          accuracy.
        </p>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
