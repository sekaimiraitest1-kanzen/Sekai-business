"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

export async function upsertCategory(input: {
  id?: string;
  slug: string;
  name_sr: string;
  name_lat: string;
  active: boolean;
}) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const row = {
    salon_id: session.salonId,
    slug: input.slug,
    // English name is no longer required in the admin form — if left
    // blank, fall back to the Latin name so the public site never shows
    // an empty category label when a visitor switches to English.
    name_sr: input.name_sr || input.name_lat,
    name_lat: input.name_lat,
    active: input.active,
  };
  // Surface unique-constraint violations as a typed error so the inline
  // "+ Nova kategorija" form on the product editor can react without a hard
  // crash. (salon_id, slug) is UNIQUE per migration 001.
  if (input.id) {
    const { error } = await sb.from("product_categories").update(row).eq("id", input.id).eq("salon_id", session.salonId);
    if (error) return { ok: false as const, error: "DB_FAILED" };
  } else {
    const { error } = await sb.from("product_categories").insert(row);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") return { ok: false as const, error: "SLUG_TAKEN" };
      return { ok: false as const, error: "DB_FAILED" };
    }
  }
  revalidatePath("/admin/shop/kategorije");
  revalidatePath("/admin/shop/proizvodi");
  revalidatePath("/shop");
  return { ok: true as const };
}

export async function deleteCategory(id: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb.from("product_categories").delete().eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/shop/kategorije");
  revalidatePath("/admin/shop/proizvodi");
  revalidatePath("/shop");
  return { ok: true as const };
}
