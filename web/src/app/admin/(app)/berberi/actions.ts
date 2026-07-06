"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/auth/with-admin";
import { uploadImage, deleteFromStorage } from "@/lib/storage/upload";
import { pathFromUrl } from "@/lib/storage/url";

export type BarberProfile = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  bio_sr: string | null;
  bio_lat: string | null;
  specialty_sr: string | null;
  specialty_lat: string | null;
  role_title_sr: string | null;
  role_title_lat: string | null;
  show_on_site: boolean;
  public_sort_order: number;
};

// Every currently-employed staff member (owner + staff), regardless of
// show_on_site — the owner needs to see everyone here to decide who to
// turn ON, not just who's already public.
export async function getBarberProfiles(): Promise<BarberProfile[]> {
  const session = await requireOwner();
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("admin_users")
    .select("id, display_name, photo_url, bio_sr, bio_lat, specialty_sr, specialty_lat, role_title_sr, role_title_lat, show_on_site, public_sort_order")
    .eq("salon_id", session.salonId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("public_sort_order", { ascending: true });
  if (error || !data) return [];
  return data as BarberProfile[];
}

export async function updateBarberProfile(
  id: string,
  patch: Partial<Pick<BarberProfile, "bio_sr" | "bio_lat" | "specialty_sr" | "specialty_lat" | "role_title_sr" | "role_title_lat" | "show_on_site">>
) {
  const session = await requireOwner();
  const sb = createAdminClient();
  await sb.from("admin_users").update(patch).eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/berberi");
  revalidatePath("/");
  revalidatePath("/zakazivanje");
  return { ok: true as const };
}

export async function uploadBarberPhoto(id: string, formData: FormData) {
  const session = await requireOwner();
  const file = formData.get("file");
  const filename = formData.get("filename");
  if (!(file instanceof Blob)) return { ok: false as const, error: "MISSING_FILE" };
  if (typeof filename !== "string" || !filename) return { ok: false as const, error: "MISSING_FILENAME" };

  const sb = createAdminClient();
  const { data: existing } = await sb.from("admin_users").select("photo_url").eq("id", id).eq("salon_id", session.salonId).maybeSingle();

  const upload = await uploadImage("gallery", file, filename);
  if (!upload.ok) return { ok: false as const, error: upload.error };

  await sb.from("admin_users").update({ photo_url: upload.url }).eq("id", id).eq("salon_id", session.salonId);

  // Best-effort cleanup of the previous photo — not fatal if it fails.
  if (existing?.photo_url) {
    const path = pathFromUrl(existing.photo_url, "gallery");
    if (path) await deleteFromStorage("gallery", path);
  }

  revalidatePath("/admin/berberi");
  revalidatePath("/");
  revalidatePath("/zakazivanje");
  return { ok: true as const, url: upload.url };
}

export async function reorderBarbers(idsInOrder: string[]) {
  const session = await requireOwner();
  const sb = createAdminClient();
  await Promise.all(
    idsInOrder.map((id, idx) => sb.from("admin_users").update({ public_sort_order: idx }).eq("id", id).eq("salon_id", session.salonId))
  );
  revalidatePath("/admin/berberi");
  revalidatePath("/");
  return { ok: true as const };
}
