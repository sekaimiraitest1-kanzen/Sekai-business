/** Extract the storage path from a Supabase public URL. Pure helper, no server-only side effects. */
export function pathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return url.substring(idx + marker.length);
}
