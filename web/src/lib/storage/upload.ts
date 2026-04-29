"use server";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

// Server-side enforcement: only these MIME types may land in Storage.
// Client-side compress-client.ts always produces image/webp, but bypassing the
// client (Postman, curl) must not allow .html, .svg, .exe, etc. through.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — Supabase bucket limit is 10MB, leave headroom

/**
 * Upload an image to a public Supabase Storage bucket and return the public URL.
 *
 * Server-enforced invariants:
 *   - file.type ∈ ALLOWED_MIME (jpeg/png/webp/gif) — rejects spoofed types
 *   - file.size ≤ 8MB
 *   - on-disk path = `${timestamp}-${random16hex}.${ext}` (user-controlled
 *     filename is NOT used for storage — it's a hint only, kept in the signature
 *     for backwards compat with existing callers)
 *
 * Buckets: 'gallery' | 'products' | 'avatars'
 *
 * Compression / WebP conversion is applied client-side before this call
 * (see lib/storage/compress-client.ts) — server just validates + stores.
 */
export async function uploadImage(
  bucket: "gallery" | "products" | "avatars",
  file: Blob,
  _filenameHint?: string
): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  await requireAdmin();

  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: `INVALID_FILE_TYPE:${file.type || "unknown"}` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `FILE_TOO_LARGE:${file.size}` };
  }
  if (file.size === 0) {
    return { ok: false, error: "EMPTY_FILE" };
  }

  const sb = createAdminClient();

  // Generate the storage path server-side — never trust the client's filename.
  const ext = EXT_BY_MIME[file.type];
  const path = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
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
