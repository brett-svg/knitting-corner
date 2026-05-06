import Link from "next/link";
import { notFound } from "next/navigation";
import { getPattern, getYarns } from "@/lib/data";
import { YarnCard } from "@/components/YarnCard";
import { ColorPreview } from "@/components/ColorPreview";

export const dynamic = "force-dynamic";

export default async function PatternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pattern, yarns] = await Promise.all([getPattern(id), getYarns()]);
  if (!pattern) notFound();

  const matches = yarns
    .filter((y) => {
      if (pattern.yarnWeight && y.weight !== pattern.yarnWeight) return false;
      const total = y.yardage * y.skeins;
      if (pattern.requiredYardage && total < pattern.requiredYardage) return false;
      return true;
    })
    .sort((a, b) => b.yardage * b.skeins - a.yardage * a.skeins);

  return (
    <div className="space-y-10">
      <header className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <div
          className="aspect-[4/5] w-full overflow-hidden rounded-2xl"
          style={!pattern.coverUrl ? { background: pattern.cover } : undefined}
        >
          {pattern.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pattern.coverUrl}
              alt={pattern.name}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Pattern
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">
            {pattern.name}
          </h1>
          {pattern.designer && (
            <p className="mt-2 text-muted">by {pattern.designer}</p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-3">
            <Spec label="Weight" value={pattern.yarnWeight ?? "—"} />
            <Spec
              label="Required"
              value={
                pattern.requiredYardage
                  ? `${pattern.requiredYardage.toLocaleString()} yds`
                  : "—"
              }
            />
            <Spec label="Needles" value={pattern.needleSize ?? "—"} />
            <Spec
              label="Source"
              value={
                pattern.pdfPath
                  ? "PDF"
                  : pattern.externalUrl
                    ? "Link"
                    : "—"
              }
            />
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {pattern.pdfPath && (
              <a
                href={`/api/patterns/${pattern.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="btn-grad"
              >
                Open PDF →
              </a>
            )}
            {pattern.externalUrl && (
              <a
                href={pattern.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                Open link →
              </a>
            )}
            <Link href="/projects" className="btn-ghost">
              Start project
            </Link>
          </div>

          {pattern.notes && (
            <p className="mt-6 max-w-prose text-sm text-muted">
              {pattern.notes}
            </p>
          )}
        </div>
      </header>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Stash match
            </p>
            <h2 className="mt-1 font-display text-3xl tracking-tight">
              {matches.length > 0 ? (
                <>
                  {matches.length} skein
                  {matches.length === 1 ? "" : "s"} could{" "}
                  <span className="italic text-grad">make this</span>
                </>
              ) : (
                <>
                  Nothing in your stash{" "}
                  <span className="italic text-grad">fits — yet</span>
                </>
              )}
            </h2>
            {(pattern.yarnWeight || pattern.requiredYardage) && (
              <p className="mt-2 text-sm text-muted">
                Filtered by{" "}
                {pattern.yarnWeight && (
                  <>
                    weight <span className="text-ink">{pattern.yarnWeight}</span>
                  </>
                )}
                {pattern.yarnWeight && pattern.requiredYardage && " · "}
                {pattern.requiredYardage && (
                  <>
                    ≥{" "}
                    <span className="text-ink">
                      {pattern.requiredYardage.toLocaleString()} yds
                    </span>{" "}
                    available
                  </>
                )}
              </p>
            )}
          </div>
          <Link
            href="/stash"
            className="text-sm font-medium text-muted hover:text-ink"
          >
            View stash →
          </Link>
        </div>

        {matches.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-grad-cool opacity-70" />
            <p className="font-display text-xl">No matching skeins</p>
            <p className="max-w-sm text-sm text-muted">
              Try scanning a few new yarns, or relax the pattern's weight
              requirement.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {matches.map((y) => (
              <YarnCard key={y.id} yarn={y} />
            ))}
          </div>
        )}
      </section>

      <ColorPreview
        allocated={[]}
        stash={matches.length > 0 ? matches : yarns}
        title="Plan colors"
        subtitle={
          <>
            Try it in your <span className="italic text-grad">stash</span>
          </>
        }
        emptyHint={
          matches.length > 0
            ? "Add yarns from your matching stash to mock up how this pattern would look."
            : "Add yarns from your stash to mock up how this pattern would look."
        }
      />
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white/70 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-base">{value}</dd>
    </div>
  );
}
