import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/auth/with-admin";
import { parseSocialLinks } from "@/lib/social-links";
import { PodesavanjaClient } from "./podesavanja-client";

export const dynamic = "force-dynamic";

const ICAL_SALT = "trisa-ical-feed-v1";

function icalToken(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return crypto.createHash("sha256").update(secret + ICAL_SALT).digest("hex").slice(0, 32);
}

// Owner-only page — staff hitting this gets thrown FORBIDDEN_STAFF and
// bounced to /admin/login by the route's error boundary. Nothing inside
// podesavanja is staff-relevant (PIN management, banner, social, employees,
// system info), so guarding the whole page is correct.
export default async function PodesavanjaPage() {
  const session = await requireOwner();
  const sb = createAdminClient();
  const [annsRes, salonRes, activeStaffRes, archivedStaffRes, staffStatsRes] = await Promise.all([
    sb
      .from("site_announcements")
      .select("*")
      .eq("salon_id", session.salonId)
      .order("created_at", { ascending: false }),
    sb.from("salons").select("social_links").eq("id", session.salonId).single(),
    sb
      .from("admin_users")
      .select("id, display_name, first_name, last_name, phone, role, is_active, email, created_at")
      .eq("salon_id", session.salonId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    sb
      .from("admin_users")
      .select("id, display_name, first_name, last_name, phone, email, deleted_at, created_at")
      .eq("salon_id", session.salonId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    // For each staff_id, count distinct customers they've completed work
    // for. Single fetch — we group in JS rather than running per-staff
    // queries. Restricted to status='done' so cancellations don't inflate
    // the lifetime number.
    sb
      .from("bookings")
      .select("staff_id, customer_id")
      .eq("salon_id", session.salonId)
      .eq("status", "done")
      .not("staff_id", "is", null)
      .not("customer_id", "is", null),
  ]);

  // Map staff_id → unique customer count. Object keyed by staff_id rather
  // than Map<> so the result serialises cleanly to the client component
  // and we don't need downlevelIteration on tsconfig.
  const customerCountObj: Record<string, number> = {};
  {
    const buckets: Record<string, Set<string>> = {};
    for (const row of (staffStatsRes.data ?? []) as { staff_id: string | null; customer_id: string | null }[]) {
      if (!row.staff_id || !row.customer_id) continue;
      const s = buckets[row.staff_id] ?? (buckets[row.staff_id] = new Set<string>());
      s.add(row.customer_id);
    }
    for (const k of Object.keys(buckets)) customerCountObj[k] = buckets[k].size;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const icalUrl = `${baseUrl}/api/ical?t=${icalToken()}`;
  const socialLinks = parseSocialLinks(salonRes.data?.social_links);

  return (
    <PodesavanjaClient
      announcements={annsRes.data ?? []}
      email={session.email}
      icalUrl={icalUrl}
      socialLinks={socialLinks}
      staff={activeStaffRes.data ?? []}
      archivedStaff={archivedStaffRes.data ?? []}
      customerCountByStaff={customerCountObj}
      currentUserId={session.adminUserId}
    />
  );
}
