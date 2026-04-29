"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

export async function saveCustomerNote(id: string, note: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb.from("customers").update({ admin_notes: note }).eq("id", id).eq("salon_id", session.salonId);
  revalidatePath(`/admin/musterije/${id}`);
  return { ok: true as const };
}
