import Link from "next/link";
import { getProjects, getYarns } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, yarns] = await Promise.all([getProjects(), getYarns()]);
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Workshop
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">
            Your <span className="italic text-grad">projects</span>
          </h1>
          <p className="mt-2 text-muted">
            {projects.length} project{projects.length === 1 ? "" : "s"} ·
            tap to update progress, status, and yarn.
          </p>
        </div>
        <Link href="/projects/new" className="btn-grad">
          + New project
        </Link>
      </header>

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-grad-cool" />
          <p className="font-display text-2xl">Nothing on the needles</p>
          <p className="max-w-sm text-sm text-muted">
            Pick a pattern and assign some yarn to start your first project.
          </p>
          <Link href="/projects/new" className="btn-grad mt-2">
            Start a project
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((p) => {
            const linked = yarns.filter((y) => p.yarnIds.includes(y.id));
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <div
                  className="aspect-[16/8] w-full"
                  style={{ background: p.hero }}
                />
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-2xl tracking-tight">
                      {p.name}
                    </p>
                    <span className="chip">{p.status}</span>
                  </div>
                  <p className="text-sm text-muted">
                    Pattern by {p.pattern}
                    {p.recipient && (
                      <>
                        {" · "}
                        for <span className="text-ink">{p.recipient}</span>
                      </>
                    )}
                  </p>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-tint">
                    <div
                      className="h-full rounded-full bg-grad-signature"
                      style={{ width: `${Math.round(p.progress * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <p className="text-xs text-muted">Yarn:</p>
                    <div className="flex -space-x-2">
                      {linked.map((y) => (
                        <span
                          key={y.id}
                          title={`${y.brand} · ${y.colorway}`}
                          className="h-6 w-6 rounded-full ring-2 ring-white"
                          style={{ background: y.swatch }}
                        />
                      ))}
                    </div>
                    <p className="ml-auto text-xs text-muted">
                      {linked.length} skein{linked.length === 1 ? "" : "s"}{" "}
                      reserved
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
