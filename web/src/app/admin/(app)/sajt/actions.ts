"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

export async function upsertContent(key: string, valueSr: string, valueLat: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb
    .from("site_content")
    .upsert(
      { salon_id: session.salonId, key, value_sr: valueSr, value_lat: valueLat },
      { onConflict: "salon_id,key" }
    );
  revalidatePath("/");
  revalidatePath("/admin/sajt");
  return { ok: true as const };
}

type WorkingHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string } | null>;

export async function updateSalon(patch: {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  workingHours?: WorkingHours;
}) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.address !== undefined) update.address = patch.address;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.email !== undefined) update.email = patch.email;
  if (patch.workingHours) update.working_hours = patch.workingHours;
  await sb.from("salons").update(update).eq("id", session.salonId);
  revalidatePath("/");
  revalidatePath("/admin/sajt");
  return { ok: true as const };
}
