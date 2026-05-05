import Link from "next/link";
import type { Yarn } from "@/lib/mock";
import clsx from "clsx";

export function YarnCard({ yarn }: { yarn: Yarn }) {
  return (
    <Link
      href={`/stash/${yarn.id}`}
      className={clsx(
        "group card block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-glow"
      )}
    >
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
      </div>
    </Link>
  );
}
