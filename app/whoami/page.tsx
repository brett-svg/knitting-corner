import Link from "next/link";
import { hasSupabase, supabaseServer, getUser } from "@/lib/supabase/server";
import { getYarns } from "@/lib/data";

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
  const errors: string[] = [];

  if (hasSupabase()) {
    const supabase = await supabaseServer();
    const yarns = await supabase
      .from("yarns")
      .select("id", { count: "exact", head: true });
    if (yarns.error) errors.push(`yarns: ${yarns.error.message}`);
    counts.yarns = yarns.count ?? 0;

    const projects = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true });
    if (projects.error) errors.push(`projects: ${projects.error.message}`);
    counts.projects = projects.count ?? 0;

    const patterns = await supabase
      .from("patterns")
      .select("id", { count: "exact", head: true });
    if (patterns.error) errors.push(`patterns: ${patterns.error.message}`);
    counts.patterns = patterns.count ?? 0;
  }

  // Fetch up to 5 most recent yarns to display id + brand + colorway
  let recent: Array<{
    id: string;
    user_id: string;
    brand: string | null;
    colorway: string | null;
    created_at: string;
  }> = [];
  if (hasSupabase()) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("yarns")
      .select("id,user_id,brand,colorway,created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) errors.push(`recent: ${error.message}`);
    recent = data ?? [];
  }

  // Run the same getYarns() that /stash uses, surface any error
  let stashYarns: Awaited<ReturnType<typeof getYarns>> = [];
  let stashError: string | null = null;
  try {
    stashYarns = await getYarns();
  } catch (e) {
    stashError = e instanceof Error ? e.message : "unknown";
  }

  // Run the raw query that getYarns runs, no error swallowing
  let rawCount = 0;
  let rawError: string | null = null;
  if (hasSupabase()) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("yarns")
      .select(
        "id,brand,product_line,colorway,dye_lot,fiber,weight_category,yardage,meters,skein_weight_grams,skeins,reserved,swatch,image_url,storage_location_id,notes,created_at"
      )
      .order("created_at", { ascending: false });
    if (error) rawError = error.message;
    rawCount = data?.length ?? 0;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Diagnostics
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">
          Who am I?
        </h1>
      </header>

      <section className="card space-y-3 p-5">
        <Row label="Email" value={user.email ?? "—"} />
        <Row label="User ID" value={user.id} mono />
        <Row label="Yarns visible to you" value={counts.yarns.toString()} />
        <Row label="Projects visible" value={counts.projects.toString()} />
        <Row label="Patterns visible" value={counts.patterns.toString()} />
      </section>

      <section className="card space-y-3 p-5">
        <p className="text-xs uppercase tracking-wider text-muted">
          5 most recent yarns visible to your session
        </p>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">
            No yarns are visible to this session. If you've added rows to the
            DB but they don't appear here, RLS is filtering them out — usually
            because the row's <code>user_id</code> doesn't equal yours above.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((y) => (
              <li
                key={y.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span>
                  <span className="font-display">
                    {y.brand ?? "?"} · {y.colorway ?? "?"}
                  </span>
                  <span
                    className={
                      y.user_id === user.id
                        ? "ml-2 text-[11px] text-accent-teal"
                        : "ml-2 text-[11px] text-accent-rose"
                    }
                  >
                    {y.user_id === user.id ? "✓ owned by you" : "⚠ owned by another user"}
                  </span>
                </span>
                <Link
                  href={`/stash/${y.id}`}
                  className="font-mono text-xs text-muted hover:text-ink"
                >
                  {y.id.slice(0, 8)}…
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <p className="text-xs uppercase tracking-wider text-muted">
          What /stash sees
        </p>
        <Row label="Yarns getYarns() returns" value={stashYarns.length.toString()} />
        <Row
          label="Raw select (no helper) row count"
          value={rawCount.toString()}
        />
        {rawError && (
          <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-xs text-accent-rose">
            Raw select error: {rawError}
          </p>
        )}
        {stashError && (
          <p className="rounded-xl border border-accent-rose/50 bg-accent-rose/10 px-3 py-2 text-xs text-accent-rose">
            getYarns() threw: {stashError}
          </p>
        )}
      </section>

      {errors.length > 0 && (
        <section className="card p-5">
          <p className="text-xs uppercase tracking-wider text-accent-rose">
            Errors
          </p>
          <ul className="mt-2 space-y-1 text-sm text-accent-rose">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <span
        className={
          mono
            ? "break-all text-right font-mono text-xs text-ink"
            : "text-right text-sm text-ink"
        }
      >
        {value}
      </span>
    </div>
  );
}
