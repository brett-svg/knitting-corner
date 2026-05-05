import Link from "next/link";
import { getProjects, getStats, getYarns } from "@/lib/data";
import { YarnCard } from "@/components/YarnCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [yarns, projects, stats] = await Promise.all([
    getYarns(),
    getProjects(),
    getStats(),
  ]);
  const recent = [...yarns]
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    .slice(0, 4);
  const active = projects.filter((p) => p.status === "Active");
  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "Still up?"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";

  return (
    <div className="space-y-14">
      <section className="animate-rise">
        <p className="text-sm uppercase tracking-[0.18em] text-muted">
          {greeting}, Brett
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
          A quiet place for your{" "}
          <span className="italic text-grad">stash, plans &amp; making</span>.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted">
          Snap a yarn label and the rest fills itself in. Plan a project and
          your stash knows what's reserved.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/stash/add/scan" className="btn-grad">
            <CameraIcon /> Scan a label
          </Link>
          <Link href="/stash" className="btn-ghost">
            Browse stash →
          </Link>
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Skeins" value={stats.skeins} />
          <Stat label="Total yardage" value={stats.yardage.toLocaleString()} />
          <Stat label="Brands" value={stats.brands} />
          <Stat label="Active projects" value={stats.projects} />
        </dl>
      </section>

      <section>
        <SectionHeader
          eyebrow="On the needles"
          title="Active projects"
          href="/projects"
        />
        {active.length === 0 ? (
          <EmptyCard text="No active projects yet — start one from a pattern." />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {active.map((p) => (
              <article
                key={p.id}
                className="card grad-border overflow-hidden p-0"
              >
                <div
                  className="aspect-[16/7] w-full"
                  style={{ background: p.hero }}
                />
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-2xl tracking-tight">
                      {p.name}
                    </p>
                    <span className="chip">{p.status}</span>
                  </div>
                  <p className="text-sm text-muted">Pattern by {p.pattern}</p>
                  <ProgressBar value={p.progress} />
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted">
                      Updated{" "}
                      {new Date(p.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-sm font-medium text-ink hover:text-grad"
                    >
                      Resume →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Fresh fiber"
          title="Recently added"
          href="/stash"
        />
        {recent.length === 0 ? (
          <EmptyCard text="Your stash is empty — scan your first label to begin." />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {recent.map((y) => (
              <YarnCard key={y.id} yarn={y} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card px-4 py-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl tracking-tight">{value}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  href,
}: {
  eyebrow: string;
  title: string;
  href: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-3xl tracking-tight">{title}</h2>
      </div>
      <Link
        href={href}
        className="text-sm font-medium text-muted hover:text-ink"
      >
        View all →
      </Link>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-tint">
      <div
        className="h-full rounded-full bg-grad-signature"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <div className="h-10 w-10 rounded-full bg-grad-warm opacity-70" />
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="16"
      height="16"
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
