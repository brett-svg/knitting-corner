"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RecomputeSwatchesButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/yarns/recompute-swatches", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setResult(
        `Updated ${json.updated} of ${json.total} yarns — ${json.viaAi ?? 0} from photo, ${json.viaName ?? 0} from name.`
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={run} disabled={busy} className="btn-grad disabled:opacity-60">
        {busy ? "Recomputing…" : "Refresh swatches from colorway names"}
      </button>
      {result && <p className="text-xs text-muted">{result}</p>}
      {error && <p className="text-xs text-accent-rose">{error}</p>}
    </div>
  );
}
