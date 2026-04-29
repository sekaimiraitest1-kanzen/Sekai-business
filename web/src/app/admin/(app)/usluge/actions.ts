"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

export type ServiceInput = {
  id?: string;
  name_sr: string;
  name_lat: string;
  price: number;
  duration_min: number;
  active: boolean;
  sort_order?: number;
  featured?: boolean;
  description_sr?: string;
  description_lat?: string;
  meta_sr?: string;
  meta_lat?: string;
};

export async function upsertService(input: ServiceInput) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  // L11: append-at-end for new rows. Old code used 999 as a sentinel which
  // meant every new service collided with previous "new" services and the
  // resulting order was insertion-time dependent.
  let sortOrder = input.sort_order;
  if (sortOrder === undefined && !input.id) {
    const { data: maxRow } = await sb
      .from("services")
      .select("sort_order")
      .eq("salon_id", session.salonId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (maxRow?.sort_order ?? -1) + 1;
  }
  const row = {
    salon_id: session.salonId,
    name_sr: input.name_sr,
    name_lat: input.name_lat,
    price: input.price,
    duration_min: input.duration_min,
    active: input.active,
    sort_order: sortOrder ?? 0,
    featured: input.featured ?? false,
    description_sr: input.description_sr ?? null,
    description_lat: input.description_lat ?? null,
    meta_sr: input.meta_sr ?? null,
    meta_lat: input.meta_lat ?? null,
  };
  if (input.id) {
    await sb.from("services").update(row).eq("id", input.id).eq("salon_id", session.salonId);
  } else {
    await sb.from("services").insert(row);
  }
  revalidatePath("/admin/usluge");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteService(id: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb.from("services").delete().eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/usluge");
  revalidatePath("/");
  return { ok: true as const };
}

export async function toggleServiceActive(id: string, active: boolean) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb.from("services").update({ active }).eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/usluge");
  revalidatePath("/");
  return { ok: true as const };
}

export async function reorderServices(idsInOrder: string[]) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await Promise.all(
    idsInOrder.map((id, idx) =>
      sb.from("services").update({ sort_order: idx }).eq("id", id).eq("salon_id", session.salonId)
    )
  );
  revalidatePath("/admin/usluge");
  revalidatePath("/");
  return { ok: true as const };
}
