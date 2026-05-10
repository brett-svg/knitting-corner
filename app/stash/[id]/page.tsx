import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLocations,
  getPatterns,
  getProjectsUsingYarn,
  getYarn,
} from "@/lib/data";
import { YarnEditor } from "@/components/YarnEditor";
import { PatternCard } from "@/components/PatternCard";

export const dynamic = "force-dynamic";

export default async function YarnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const yarn = await getYarn(id);
  if (!yarn) notFound();
  const [projects, locations, patterns] = await Promise.all([
    getProjectsUsingYarn(id),
    getLocations(),
    getPatterns(),
  ]);

  // "What can I make?" — patterns this yarn could become
  const total = yarn.yardage * yarn.skeins;
  const possible = patterns
    .filter((p) => {
      if (p.yarnWeight && p.yarnWeight !== yarn.weight) return false;
      if (p.requiredYardage && total < p.requiredYardage) return false;
      return true;
    })
    .sort((a, b) => (b.requiredYardage ?? 0) - (a.requiredYardage ?? 0));

  return (
    <div className="space-y-10">
      <div className="grid gap-6 md:grid-cols-[3fr_4fr]">
        <div
          className="relative aspect-square overflow-hidden rounded-3xl"
          style={!yarn.imageUrl ? { background: yarn.swatch } : undefined}
        >
          {yarn.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={yarn.imageUrl}
              alt={`${yarn.brand} ${yarn.colorway}`}
              className="h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute left-4 top-4 flex gap-2">
            <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {yarn.weight}
            </span>
            {yarn.reserved && (
              <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-ink">
                Reserved
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {yarn.brand} · {yarn.productLine}
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">
            {yarn.colorway}
          </h1>
          <p className="mt-2 text-muted">{yarn.fiber}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Spec label="Skeins" value={`×${yarn.skeins}`} />
            <Spec
              label="Per skein"
              value={`${yarn.yardage} yds${yarn.meters ? ` · ${yarn.meters}m` : ""}`}
            />
            <Spec label="Total" value={`${total.toLocaleString()} yds`} />
            <Spec
              label="Skein weight"
              value={yarn.skeinGrams ? `${yarn.skeinGrams} g` : "—"}
            />
            <Spec label="Dye lot" value={yarn.dyeLot || "—"} />
            <Spec label="Storage" value={yarn.locationName || yarn.storage || "—"} />
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/projects/new" className="btn-grad">
              Use in project
            </Link>
            <Link href="/stash" className="btn-ghost">
              ← Back to stash
            </Link>
          </div>

          {yarn.notes && (
            <p className="mt-6 max-w-prose whitespace-pre-wrap rounded-xl border border-border bg-white/70 px-4 py-3 text-sm text-ink">
              {yarn.notes}
            </p>
          )}
        </div>
      </div>

      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          What can I make?
        </p>
        <h2 className="mt-1 font-display text-3xl tracking-tight">
          {possible.length > 0 ? (
            <>
              {possible.length} pattern{possible.length === 1 ? "" : "s"} could{" "}
              <span className="italic text-grad">use this</span>
            </>
          ) : (
            <>
              No matches in your library{" "}
              <span className="italic text-grad">— yet</span>
            </>
          )}
        </h2>
        {possible.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {possible.slice(0, 8).map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        ) : (
          <div className="card mt-4 flex flex-col items-center gap-2 py-10 text-center">
            <div className="h-10 w-10 rounded-full bg-grad-warm opacity-70" />
            <p className="max-w-sm text-sm text-muted">
              Add a pattern with weight {yarn.weight} or fewer than {total}{" "}
              required yards and it'll show up here.
            </p>
            <Link href="/patterns/new" className="btn-ghost mt-2">
              Add a pattern
            </Link>
          </div>
        )}
      </section>

      {projects.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            In use
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">
            Reserved across {projects.length} project
            {projects.length === 1 ? "" : "s"}
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <span
                    className="h-12 w-12 shrink-0 rounded-xl"
                    style={{ background: p.hero }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {p.pattern} · {p.status} · {Math.round(p.progress * 100)}%
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <YarnEditor yarn={yarn} locations={locations} />
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white/70 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-display text-base">{value}</dd>
    </div>
  );
}
