"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { renderPdfPage1 } from "@/lib/pdf-cover";

export function RegenerateCoverButton({ patternId }: { patternId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      // 1. Fetch the PDF via the signed-URL redirect
      const pdfRes = await fetch(`/api/patterns/${patternId}/pdf`);
      if (!pdfRes.ok) throw new Error("Could not fetch PDF");
      const pdfBlob = await pdfRes.blob();

      // 2. Render page 1 in the browser
      const cover = await renderPdfPage1(pdfBlob);
      if (!cover) throw new Error("Render failed in browser");

      // 3. Upload it
      const fd = new FormData();
      fd.set("cover", cover, "cover.jpg");
      const upRes = await fetch(`/api/patterns/${patternId}/cover`, {
        method: "POST",
        body: fd,
      });
      const json = await upRes.json();
      if (!upRes.ok) throw new Error(json.error ?? "Save failed");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={run} disabled={busy} className="btn-ghost disabled:opacity-60">
        {busy ? "Rendering…" : done ? "Cover updated ✓" : "Regenerate cover from PDF"}
      </button>
      {error && <p className="text-xs text-accent-rose">{error}</p>}
    </div>
  );
}
