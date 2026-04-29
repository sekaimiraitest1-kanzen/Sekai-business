"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { uploadImage, deleteFromStorage } from "@/lib/storage/upload";
import { pathFromUrl } from "@/lib/storage/url";

export type ProductInput = {
  id?: string;
  slug: string;
  name_sr: string;
  name_lat: string;
  brand?: string;
  description_sr?: string;
  description_lat?: string;
  price: number;
  category?: string;
  stock: number;
  active: boolean;
  badge?: "new" | "hot" | "trisha" | null;
};

export async function upsertProduct(input: ProductInput) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const row = {
    salon_id: session.salonId,
    slug: input.slug,
    // Keep legacy `name` / `description` filled with the LAT variant so any
    // external integration that still reads them gets a sensible value. The
    // public site reads name_sr / name_lat directly from the bilingual columns.
    name: input.name_lat,
    name_sr: input.name_sr,
    name_lat: input.name_lat,
    brand: input.brand ?? null,
    description: input.description_lat ?? null,
    description_sr: input.description_sr ?? null,
    description_lat: input.description_lat ?? null,
    price: input.price,
    category: input.category ?? null,
    stock: input.stock,
    active: input.active,
    badge: input.badge ?? null,
  };
  if (input.id) {
    const { error } = await sb.from("products").update(row).eq("id", input.id).eq("salon_id", session.salonId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await sb.from("products").insert(row);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath("/admin/shop/proizvodi");
  revalidatePath("/shop");
  return { ok: true as const };
}

export async function deleteProduct(id: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { data: row } = await sb.from("products").select("image_url").eq("id", id).eq("salon_id", session.salonId).single();
  if (row?.image_url) {
    const path = pathFromUrl(row.image_url, "products");
    if (path) await deleteFromStorage("products", path);
  }
  await sb.from("products").delete().eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/shop/proizvodi");
  revalidatePath("/shop");
  return { ok: true as const };
}

export async function uploadProductImage(formData: FormData) {
  const session = await requireAdmin();
  const productId = formData.get("productId");
  const file = formData.get("file");
  const filename = formData.get("filename");

  if (typeof productId !== "string" || !productId) return { ok: false as const, error: "MISSING_PRODUCT_ID" };
  if (typeof filename !== "string" || !filename) return { ok: false as const, error: "MISSING_FILENAME" };
  if (!(file instanceof Blob)) return { ok: false as const, error: "MISSING_FILE" };

  const upload = await uploadImage("products", file, filename);
  if (!upload.ok) return { ok: false as const, error: upload.error };

  const sb = createAdminClient();
  // delete old image first
  const { data: row } = await sb.from("products").select("image_url").eq("id", productId).eq("salon_id", session.salonId).single();
  if (row?.image_url) {
    const oldPath = pathFromUrl(row.image_url, "products");
    if (oldPath) await deleteFromStorage("products", oldPath);
  }

  await sb.from("products").update({ image_url: upload.url }).eq("id", productId).eq("salon_id", session.salonId);
  revalidatePath("/admin/shop/proizvodi");
  revalidatePath("/shop");
  return { ok: true as const, url: upload.url };
}
