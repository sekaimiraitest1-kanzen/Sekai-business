"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireOwner } from "@/lib/auth/with-admin";
import {
  SOCIAL_PLATFORMS,
  parseSocialLinks,
  validateSocialUrl,
  type SocialLinks,
  type SocialPlatform,
} from "@/lib/social-links";

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

/**
 * Persist the salon's social-link configuration. Validates each URL against
 * its platform's expected hostname; an empty URL is allowed (means "don't
 * surface yet — keep the row but hide the icon"). Returns granular per-row
 * errors so the admin form can highlight just the problematic fields without
 * losing the user's other input.
 */
export async function updateSocialLinks(input: SocialLinks): Promise<
  | { ok: true }
  | { ok: false; errors: Partial<Record<SocialPlatform, string>> }
> {
  const session = await requireAdmin();
  const errors: Partial<Record<SocialPlatform, string>> = {};

  const sanitized: SocialLinks = parseSocialLinks(input);
  for (const p of SOCIAL_PLATFORMS) {
    const link = sanitized[p];
    // Trim before validation so users pasting "  https://...  " aren't punished.
    link.url = link.url.trim();
    if (link.enabled && link.url === "") {
      errors[p] = "Unesite URL ako želite da prikažete ovu mrežu";
      continue;
    }
    const v = validateSocialUrl(p, link.url);
    if (!v.ok) errors[p] = v.error;
  }

  if (Object.keys(errors).length > 0) return { ok: false as const, errors };

  const sb = createAdminClient();
  await sb.from("salons").update({ social_links: sanitized }).eq("id", session.salonId);

  // Footer is rendered on home; sameAs JSON-LD is also on home; both must
  // re-render after this write.
  revalidatePath("/admin/podesavanja");
  revalidatePath("/");
  return { ok: true as const };
}

// ─── Staff management ────────────────────────────────────────────────────
//
// All three helpers are owner-only — staff role can hit `requireOwner` and
// will throw FORBIDDEN_STAFF before any DB work happens. PIN uniqueness is
// enforced application-side (we can't UNIQUE INDEX bcrypt hashes since each
// has a fresh salt). On every write we iterate active admin_users and
// bcrypt.compare against each existing hash; if the new PIN matches anyone,
// we reject. Brute-force concern is bounded — fewer than ~5 staff per salon
// realistic, and the function only runs at create/reset time.

const PIN_RX = /^\d{4,8}$/;

async function pinCollidesWithExisting(
  sb: ReturnType<typeof createAdminClient>,
  salonId: string,
  pin: string,
  ignoreUserId?: string,
): Promise<boolean> {
  const { data } = await sb
    .from("admin_users")
    .select("id, pin_hash")
    .eq("salon_id", salonId)
    .eq("is_active", true);
  for (const row of data ?? []) {
    if (ignoreUserId && row.id === ignoreUserId) continue;
    if (!row.pin_hash) continue;
    if (await bcrypt.compare(pin, row.pin_hash)) return true;
  }
  return false;
}

export async function listStaff() {
  const session = await requireOwner();
  const sb = createAdminClient();
  const { data } = await sb
    .from("admin_users")
    .select("id, display_name, role, is_active, email, created_at")
    .eq("salon_id", session.salonId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function createStaff(input: { displayName: string; pin: string }) {
  const name = input.displayName.trim();
  if (name.length < 2 || name.length > 40) return { ok: false as const, error: "INVALID_NAME" };
  if (!PIN_RX.test(input.pin)) return { ok: false as const, error: "INVALID_PIN" };

  const session = await requireOwner();
  const sb = createAdminClient();

  if (await pinCollidesWithExisting(sb, session.salonId, input.pin)) {
    return { ok: false as const, error: "PIN_COLLISION" };
  }

  const pinHash = await bcrypt.hash(input.pin, 10);
  // email is required NOT NULL on the schema; auto-derive a unique placeholder
  // since staff don't need real email accounts. Format: staff-<short>@<salon>.local
  const placeholderEmail = `staff-${Date.now().toString(36)}@${session.salonId.slice(0, 8)}.local`;

  const { data, error } = await sb
    .from("admin_users")
    .insert({
      salon_id: session.salonId,
      email: placeholderEmail,
      role: "staff",
      pin_hash: pinHash,
      display_name: name,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: "DB_FAILED" };

  revalidatePath("/admin/podesavanja");
  return { ok: true as const, id: data.id as string };
}

export async function resetStaffPin(staffId: string, newPin: string) {
  if (!PIN_RX.test(newPin)) return { ok: false as const, error: "INVALID_PIN" };
  const session = await requireOwner();
  const sb = createAdminClient();

  const { data: target } = await sb
    .from("admin_users")
    .select("id, role")
    .eq("id", staffId)
    .eq("salon_id", session.salonId)
    .maybeSingle();
  if (!target) return { ok: false as const, error: "NOT_FOUND" };

  if (await pinCollidesWithExisting(sb, session.salonId, newPin, staffId)) {
    return { ok: false as const, error: "PIN_COLLISION" };
  }

  const newHash = await bcrypt.hash(newPin, 10);
  await sb
    .from("admin_users")
    .update({ pin_hash: newHash, failed_pin_attempts: 0, locked_until: null })
    .eq("id", staffId)
    .eq("salon_id", session.salonId);
  revalidatePath("/admin/podesavanja");
  return { ok: true as const };
}

export async function toggleStaffActive(staffId: string) {
  const session = await requireOwner();
  const sb = createAdminClient();

  // Owners cannot disable themselves — would lock them out of the only owner
  // account on the salon. Block this explicitly.
  if (staffId === session.adminUserId) {
    return { ok: false as const, error: "CANT_DISABLE_SELF" };
  }

  const { data: target } = await sb
    .from("admin_users")
    .select("id, role, is_active")
    .eq("id", staffId)
    .eq("salon_id", session.salonId)
    .maybeSingle();
  if (!target) return { ok: false as const, error: "NOT_FOUND" };

  // Disabling an owner is also blocked — should only happen if multiple
  // owners exist, which we don't support yet. Keeps the lockout-foot-gun shut.
  if (target.role !== "staff") return { ok: false as const, error: "CANT_DISABLE_OWNER" };

  await sb
    .from("admin_users")
    .update({ is_active: !target.is_active })
    .eq("id", staffId)
    .eq("salon_id", session.salonId);
  revalidatePath("/admin/podesavanja");
  return { ok: true as const, isActive: !target.is_active };
}
