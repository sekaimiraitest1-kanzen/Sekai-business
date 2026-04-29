"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { uploadImage, deleteFromStorage } from "@/lib/storage/upload";
import { pathFromUrl } from "@/lib/storage/url";

export async function createGalleryImage(formData: FormData) {
  const session = await requireAdmin();
  const file = formData.get("file");
  const filename = formData.get("filename");
  const altSr = (formData.get("altSr") as string | null) ?? null;
  const altLat = (formData.get("altLat") as string | null) ?? null;
  const size = (formData.get("size") as string | null) === "large" ? "large" : "normal";

  if (!(file instanceof Blob)) return { ok: false as const, error: "MISSING_FILE" };
  if (typeof filename !== "string" || !filename) return { ok: false as const, error: "MISSING_FILENAME" };

  const upload = await uploadImage("gallery", file, filename);
  if (!upload.ok) return { ok: false as const, error: upload.error };

  const sb = createAdminClient();
  // Determine sort order = max + 1
  const { data: maxRow } = await sb
    .from("gallery_images")
    .select("sort_order")
    .eq("salon_id", session.salonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await sb.from("gallery_images").insert({
    salon_id: session.salonId,
    url: upload.url,
    alt_sr: altSr,
    alt_lat: altLat,
    size,
    sort_order: nextOrder,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/galerija");
  revalidatePath("/");
  return { ok: true as const, url: upload.url };
}

export async function updateGalleryImage(id: string, patch: { alt_sr?: string; alt_lat?: string; size?: "normal" | "large" }) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb.from("gallery_images").update(patch).eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/galerija");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteGalleryImage(id: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { data: row } = await sb.from("gallery_images").select("url").eq("id", id).eq("salon_id", session.salonId).single();
  if (row?.url) {
    const path = pathFromUrl(row.url, "gallery");
    if (path) await deleteFromStorage("gallery", path);
  }
  await sb.from("gallery_images").delete().eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/galerija");
  revalidatePath("/");
  return { ok: true as const };
}

export async function reorderGalleryImages(idsInOrder: string[]) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await Promise.all(
    idsInOrder.map((id, idx) => sb.from("gallery_images").update({ sort_order: idx }).eq("id", id).eq("salon_id", session.salonId))
  );
  revalidatePath("/admin/galerija");
  revalidatePath("/");
  return { ok: true as const };
}
