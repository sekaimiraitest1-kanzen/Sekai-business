"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

export async function updateOrderStatus(id: string, status: "pending" | "ready" | "picked_up" | "cancelled") {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb.from("orders").update({ status }).eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/shop/porudzbine");
  return { ok: true as const };
}
