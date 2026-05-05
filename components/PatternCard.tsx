import Link from "next/link";
import type { Pattern } from "@/lib/mock";

export function PatternCard({ pattern }: { pattern: Pattern }) {
  return (
    <Link
      href={`/patterns/${pattern.id}`}
      className="group card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden"
        style={!pattern.coverUrl ? { background: pattern.cover } : undefined}
      >
        {pattern.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pattern.coverUrl}
            alt={pattern.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="font-display text-xl leading-tight tracking-tight drop-shadow-sm">
            {pattern.name}
          </p>
          {pattern.designer && (
            <p className="text-xs text-white/85">{pattern.designer}</p>
          )}
        </div>
        <div className="absolute right-3 top-3 flex gap-1.5">
          {pattern.yarnWeight && (
            <span className="rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-medium text-ink">
              {pattern.yarnWeight}
            </span>
          )}
          {pattern.pdfPath && (
            <span className="rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              PDF
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between p-3 text-xs text-muted">
        <span>
          {pattern.requiredYardage
            ? `${pattern.requiredYardage.toLocaleString()} yds`
            : "—"}
        </span>
        <span>{pattern.needleSize ?? "—"}</span>
      </div>
    </Link>
  );
}
