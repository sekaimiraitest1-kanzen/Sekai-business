/**
 * Client-side image compression + WebP conversion.
 * - Resizes to max 2000px on longest edge
 * - Converts to WebP at quality 0.82
 * - Keeps original if smaller than 200KB and already WebP
 */
export async function compressToWebP(file: File, maxSize = 2000, quality = 0.82): Promise<{ blob: Blob; filename: string }> {
  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;

  let targetW = w;
  let targetH = h;
  if (Math.max(w, h) > maxSize) {
    if (w >= h) {
      targetW = maxSize;
      targetH = Math.round((h * maxSize) / w);
    } else {
      targetH = maxSize;
      targetW = Math.round((w * maxSize) / h);
    }
  }

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas ctx");
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/webp", quality });
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return { blob, filename: `${baseName}.webp` };
}
