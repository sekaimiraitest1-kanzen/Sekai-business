"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

/**
 * Upload an image to a public Supabase Storage bucket and return the public URL.
 * Buckets: 'gallery' | 'products' | 'avatars'
 *
 * Compression / WebP conversion is applied client-side before this call
 * (see lib/storage/compress-client.ts) — server just stores the result.
 */
export async function uploadImage(
  bucket: "gallery" | "products" | "avatars",
  file: ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  await requireAdmin();
  const sb = createAdminClient();

  // Sanitize filename + add timestamp prefix to avoid collisions
  const safe = filename.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
  const path = `${Date.now()}-${safe}`;

  const { error } = await sb.storage.from(bucket).upload(path, file, {
    contentType: mimeType,
    upsert: false,
    cacheControl: "31536000", // 1 year
  });
  if (error) return { ok: false, error: error.message };

  const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
  return { ok: true, url: pub.publicUrl, path };
}

export async function deleteFromStorage(bucket: "gallery" | "products" | "avatars", path: string) {
  await requireAdmin();
  const sb = createAdminClient();
  await sb.storage.from(bucket).remove([path]);
  return { ok: true as const };
}

/** Extract the storage path from a Supabase public URL. */
export function pathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return url.substring(idx + marker.length);
}
