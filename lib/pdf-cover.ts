// Render page 1 of a PDF to a JPEG Blob in the browser using pdf.js.
// Way more reliable than server-side canvas rendering, and runs lazy.

export async function renderPdfPage1(
  file: File | Blob,
  maxEdge = 1100,
  quality = 0.85
): Promise<Blob | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    // Use the matching version's worker from a CDN — no bundling pain.
    if (typeof window !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const page = await doc.getPage(1);

    // Pick a scale so the longest edge lands near maxEdge
    const baseViewport = page.getViewport({ scale: 1 });
    const longest = Math.max(baseViewport.width, baseViewport.height);
    const scale = Math.min(2.5, Math.max(1, maxEdge / longest));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
  } catch (err) {
    console.warn("[pdf-cover] render failed:", err);
    return null;
  }
}
