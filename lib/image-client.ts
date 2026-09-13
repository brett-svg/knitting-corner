// Browser-side image prep for label photos.

export async function compressToDataUrl(
  file: File,
  maxEdge = 1280,
  quality = 0.82
): Promise<string> {
  let source: ImageBitmap | HTMLImageElement | null = await createImageBitmap(
    file
  ).catch(() => null);

  if (!source) {
    source = await loadViaImage(file).catch(() => null);
  }

  if (!source) {
    throw new Error(
      `Couldn't read this image (${file.type || "unknown type"}). ` +
        "Try a JPEG or PNG — iPhones may need 'Camera → Formats → Most Compatible'."
    );
  }

  const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

function loadViaImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

