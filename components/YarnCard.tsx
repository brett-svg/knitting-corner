import Link from "next/link";
import type { Yarn } from "@/lib/mock";
import clsx from "clsx";

export function YarnCard({
  yarn,
  selectable = false,
  selected = false,
  onToggle,
}: {
  yarn: Yarn;
  // In select mode the card toggles selection instead of opening the yarn.
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const className = clsx(
    "group card block w-full overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-glow",
    selected && "ring-2 ring-accent-lavender shadow-glow"
  );
  const body = <YarnCardBody yarn={yarn} selectable={selectable} selected={selected} />;
  if (selectable) {
    return (
      <button type="button" onClick={onToggle} aria-pressed={selected} className={className}>
        {body}
      </button>
    );
  }
  return (
    <Link href={`/stash/${yarn.id}`} className={className}>
      {body}
    </Link>
  );
}

function YarnCardBody({
  yarn,
  selectable,
  selected,
}: {
  yarn: Yarn;
  selectable: boolean;
  selected: boolean;
}) {
  return (
    <>
      <div
        className="relative aspect-[5/4] w-full overflow-hidden"
        style={!yarn.imageUrl ? { background: yarn.swatch } : undefined}
      >
        {yarn.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={yarn.imageUrl}
            alt={`${yarn.brand} ${yarn.colorway}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/30 mix-blend-overlay" />
            <svg
              className="absolute inset-0 h-full w-full opacity-40 mix-blend-soft-light transition group-hover:opacity-60"
              viewBox="0 0 200 160"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <pattern
                  id={`loops-${yarn.id}`}
                  x="0"
                  y="0"
                  width="22"
                  height="14"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M0 7 Q 5.5 -2, 11 7 T 22 7"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </pattern>
              </defs>
              <rect width="200" height="160" fill={`url(#loops-${yarn.id})`} />
            </svg>
          </>
        )}

        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-black/35 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            {yarn.weight}
          </span>
          {yarn.reserved && (
            <span className="rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-medium text-ink">
              Reserved
            </span>
          )}
        </div>

        {selectable && (
          <span
            aria-hidden
            className={clsx(
              "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold shadow-soft transition",
              selected
                ? "border-white bg-grad-signature text-white"
                : "border-white/90 bg-black/20 text-transparent"
            )}
          >
            ✓
          </span>
        )}

        <div className="absolute bottom-3 right-3">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink shadow-soft">
            ×{yarn.skeins}
          </span>
        </div>
      </div>

      <div className="space-y-1 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-display text-lg leading-tight tracking-tight">
            {yarn.colorway}
          </p>
          <p className="shrink-0 text-xs text-muted">
            {yarn.yardage * yarn.skeins} yds
          </p>
        </div>
        <p className="truncate text-sm text-muted">
          {yarn.brand} · {yarn.productLine}
        </p>
        <p className="truncate text-xs text-muted/80">{yarn.fiber}</p>
        {yarn.locationName && (
          <p className="truncate pt-1 text-[11px] font-medium uppercase tracking-wider text-muted">
            {yarn.locationName}
          </p>
        )}
      </div>
    </>
  );
}
