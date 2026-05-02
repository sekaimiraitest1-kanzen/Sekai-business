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
  // Collision check ignores soft-deleted rows — a returning ex-employee
  // could legitimately re-use their old PIN since the original row no
  // longer participates in login.
  const { data } = await sb
    .from("admin_users")
    .select("id, pin_hash")
    .eq("salon_id", salonId)
    .eq("is_active", true)
    .is("deleted_at", null);
  for (const row of data ?? []) {
    if (ignoreUserId && row.id === ignoreUserId) continue;
    if (!row.pin_hash) continue;
    if (await bcrypt.compare(pin, row.pin_hash)) return true;
  }
  return false;
}

/**
 * Active roster — owner row + employees that are neither paused nor archived.
 * The settings page renders this as the primary list with action buttons.
 */
export async function listStaff() {
  const session = await requireOwner();
  const sb = createAdminClient();
  const { data } = await sb
    .from("admin_users")
    .select("id, display_name, first_name, last_name, phone, role, is_active, email, created_at")
    .eq("salon_id", session.salonId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return data ?? [];
}

function nullIfBlank(s: string | undefined | null): string | null {
  if (!s) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

function deriveDisplayName(firstName: string, lastName: string | null): string {
  const f = firstName.trim();
  const l = lastName?.trim() ?? "";
  return l ? `${f} ${l}` : f;
}

/**
 * Create a new staff member. Required: firstName + pin. Optional: lastName,
 * phone, email — used for the HR archive (still visible after delete).
 * `display_name` is auto-derived from first+last so the UI doesn't need to
 * worry about which field to render.
 */
export async function createStaff(input: {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  pin: string;
}) {
  const firstName = input.firstName.trim();
  const lastName = nullIfBlank(input.lastName);
  const phone = nullIfBlank(input.phone);
  const userEmail = nullIfBlank(input.email);
  if (firstName.length < 2 || firstName.length > 40) return { ok: false as const, error: "INVALID_NAME" };
  if (lastName && lastName.length > 40) return { ok: false as const, error: "INVALID_NAME" };
  if (!PIN_RX.test(input.pin)) return { ok: false as const, error: "INVALID_PIN" };

  const session = await requireOwner();
  const sb = createAdminClient();

  if (await pinCollidesWithExisting(sb, session.salonId, input.pin)) {
    return { ok: false as const, error: "PIN_COLLISION" };
  }

  const pinHash = await bcrypt.hash(input.pin, 10);
  // email is NOT NULL on the schema. If the owner gave one, use it. Else
  // generate a salon-scoped placeholder so login flow has a stable handle.
  const finalEmail = userEmail ?? `staff-${Date.now().toString(36)}@${session.salonId.slice(0, 8)}.local`;

  const { data, error } = await sb
    .from("admin_users")
    .insert({
      salon_id: session.salonId,
      email: finalEmail,
      role: "staff",
      pin_hash: pinHash,
      display_name: deriveDisplayName(firstName, lastName),
      first_name: firstName,
      last_name: lastName,
      phone,
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
    .is("deleted_at", null)
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

  if (staffId === session.adminUserId) {
    return { ok: false as const, error: "CANT_DISABLE_SELF" };
  }

  const { data: target } = await sb
    .from("admin_users")
    .select("id, role, is_active")
    .eq("id", staffId)
    .eq("salon_id", session.salonId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!target) return { ok: false as const, error: "NOT_FOUND" };

  if (target.role !== "staff") return { ok: false as const, error: "CANT_DISABLE_OWNER" };

  await sb
    .from("admin_users")
    .update({ is_active: !target.is_active })
    .eq("id", staffId)
    .eq("salon_id", session.salonId);
  revalidatePath("/admin/podesavanja");
  return { ok: true as const, isActive: !target.is_active };
}

/**
 * Soft-delete a staff member. Row stays in the table — past bookings keep
 * their staff_id reference so revenue / customer-count stats remain
 * computable, and the archive list (`listArchivedStaff`) renders the row
 * with full HR context for as long as Triša wants.
 *
 * Owners cannot delete themselves and the owner role itself can't be
 * deleted (would orphan the salon). Same guard pattern as toggle.
 */
export async function softDeleteStaff(staffId: string) {
  const session = await requireOwner();
  const sb = createAdminClient();

  if (staffId === session.adminUserId) {
    return { ok: false as const, error: "CANT_DELETE_SELF" };
  }

  const { data: target } = await sb
    .from("admin_users")
    .select("id, role")
    .eq("id", staffId)
    .eq("salon_id", session.salonId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!target) return { ok: false as const, error: "NOT_FOUND" };
  if (target.role !== "staff") return { ok: false as const, error: "CANT_DELETE_OWNER" };

  await sb
    .from("admin_users")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", staffId)
    .eq("salon_id", session.salonId);
  revalidatePath("/admin/podesavanja");
  return { ok: true as const };
}
