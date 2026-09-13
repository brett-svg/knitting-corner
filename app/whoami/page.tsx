import { count, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { db, hasDb, schema } from "@/lib/db";
import { hasStorage } from "@/lib/storage";
import { hasRavelry } from "@/lib/ravelry";
import { RecomputeSwatchesButton } from "@/components/RecomputeSwatchesButton";

export const dynamic = "force-dynamic";

export default async function WhoamiPage() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="card p-6">
        <p className="text-sm text-muted">Not signed in.</p>
      </div>
    );
  }

  const counts = { yarns: 0, projects: 0, patterns: 0 };
  let dbError: string | null = null;
  if (hasDb()) {
    try {
      const [[y], [p], [pt]] = await Promise.all([
        db().select({ n: count() }).from(schema.yarns).where(eq(schema.yarns.userId, user.id)),
        db().select({ n: count() }).from(schema.projects).where(eq(schema.projects.userId, user.id)),
        db().select({ n: count() }).from(schema.patterns).where(eq(schema.patterns.userId, user.id)),
      ]);
      counts.yarns = y.n;
      counts.projects = p.n;
      counts.patterns = pt.n;
    } catch (e) {
      dbError = e instanceof Error ? e.message : "unknown";
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Diagnostics</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">Who am I?</h1>
      </header>

      <section className="card space-y-3 p-5">
        <Row label="Email" value={user.email} />
        <Row label="User ID" value={user.id} mono />
        <Row label="Yarns" value={counts.yarns.toString()} />
        <Row label="Projects" value={counts.projects.toString()} />
        <Row label="Patterns" value={counts.patterns.toString()} />
      </section>

      <section className="card space-y-3 p-5">
        <p className="text-xs uppercase tracking-wider text-muted">Services</p>
        <Row label="Database" value={hasDb() ? "connected" : "not configured (demo mode)"} />
        <Row label="File storage" value={hasStorage() ? "connected" : "not configured"} />
        <Row label="Label scanning" value={process.env.ANTHROPIC_API_KEY ? "on" : "mocked"} />
        <Row label="Ravelry lookup" value={hasRavelry() ? "on" : "off"} />
        {dbError && (
          <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-xs text-accent-rose">
            Database error: {dbError}
          </p>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <p className="text-xs uppercase tracking-wider text-muted">Maintenance</p>
        <p className="text-sm text-muted">
          Old yarns were assigned random gradients. This re-derives each one — by asking Claude
          to identify the actual color from its photo when one exists, falling back to
          colorway-name keywords otherwise.
        </p>
        <RecomputeSwatchesButton />
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <span
        className={
          mono ? "break-all text-right font-mono text-xs text-ink" : "text-right text-sm text-ink"
        }
      >
        {value}
      </span>
    </div>
  );
}
