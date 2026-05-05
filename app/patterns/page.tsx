import Link from "next/link";
import { getPatterns } from "@/lib/data";
import { PatternCard } from "@/components/PatternCard";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const patterns = await getPatterns();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Library
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">
            Your <span className="italic text-grad">patterns</span>
          </h1>
          <p className="mt-2 text-muted">
            {patterns.length} saved · upload PDFs or save links, then match
            them with your stash.
          </p>
        </div>
        <Link href="/patterns/new" className="btn-grad">
          + Add pattern
        </Link>
      </header>

      {patterns.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-grad-warm" />
          <p className="font-display text-2xl">No patterns yet</p>
          <p className="max-w-sm text-sm text-muted">
            Drop a PDF here or paste a link to start your library.
          </p>
          <Link href="/patterns/new" className="btn-grad mt-2">
            Add your first pattern
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {patterns.map((p) => (
            <PatternCard key={p.id} pattern={p} />
          ))}
        </div>
      )}
    </div>
  );
}
