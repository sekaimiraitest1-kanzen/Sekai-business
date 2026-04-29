"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

/**
 * G5 — Blocked slots: admin marks specific dates / time-slots as unavailable
 * (vacation, doctor's appointment, training day…). Public booking flow excludes
 * these from the free-slot picker via `getMyTakenSlots` extension below.
 *
 * `time_slot = NULL` means the WHOLE day is blocked.
 */
export async function createBlock(input: { date: string; timeSlot?: string; reason?: string }) {
  const session = await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false as const, error: "INVALID_DATE" };
  if (input.timeSlot && !/^\d{2}:\d{2}$/.test(input.timeSlot)) return { ok: false as const, error: "INVALID_TIME" };

  const sb = createAdminClient();
  const { error } = await sb.from("blocked_slots").insert({
    salon_id: session.salonId,
    date: input.date,
    time_slot: input.timeSlot || null,
    reason: input.reason?.trim() || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/blokirano");
  return { ok: true as const };
}

export async function deleteBlock(id: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb.from("blocked_slots").delete().eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/blokirano");
  return { ok: true as const };
}
