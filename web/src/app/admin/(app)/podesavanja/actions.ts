"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

export async function changePin(currentPin: string, newPin: string) {
  if (!/^\d{4}$/.test(newPin)) return { ok: false as const, error: "INVALID_NEW" };
  const session = await requireAdmin();
  const sb = createAdminClient();

  const { data: row } = await sb.from("admin_users").select("pin_hash").eq("id", session.adminUserId).single();
  if (!row?.pin_hash) return { ok: false as const, error: "NOT_FOUND" };

  const valid = await bcrypt.compare(currentPin, row.pin_hash);
  if (!valid) return { ok: false as const, error: "WRONG_CURRENT" };

  const newHash = await bcrypt.hash(newPin, 10);
  await sb.from("admin_users").update({ pin_hash: newHash, failed_pin_attempts: 0, locked_until: null }).eq("id", session.adminUserId);
  return { ok: true as const };
}

export async function upsertAnnouncement(input: {
  id?: string;
  title_sr?: string;
  title_lat?: string;
  body_sr: string;
  body_lat: string;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const row = {
    salon_id: session.salonId,
    title_sr: input.title_sr ?? null,
    title_lat: input.title_lat ?? null,
    body_sr: input.body_sr,
    body_lat: input.body_lat,
    active: input.active,
    starts_at: input.starts_at ?? null,
    ends_at: input.ends_at ?? null,
  };
  if (input.id) {
    await sb.from("site_announcements").update(row).eq("id", input.id).eq("salon_id", session.salonId);
  } else {
    await sb.from("site_announcements").insert(row);
  }
  revalidatePath("/admin/podesavanja");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteAnnouncement(id: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb.from("site_announcements").delete().eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/podesavanja");
  revalidatePath("/");
  return { ok: true as const };
}
