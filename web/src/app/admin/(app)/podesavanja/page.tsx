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
  const [annsRes, salonRes, staffRes] = await Promise.all([
    sb
      .from("site_announcements")
      .select("*")
      .eq("salon_id", session.salonId)
      .order("created_at", { ascending: false }),
    sb.from("salons").select("social_links").eq("id", session.salonId).single(),
    sb
      .from("admin_users")
      .select("id, display_name, role, is_active, email, created_at")
      .eq("salon_id", session.salonId)
      .order("created_at", { ascending: true }),
  ]);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const icalUrl = `${baseUrl}/api/ical?t=${icalToken()}`;
  const socialLinks = parseSocialLinks(salonRes.data?.social_links);
  return (
    <PodesavanjaClient
      announcements={annsRes.data ?? []}
      email={session.email}
      icalUrl={icalUrl}
      socialLinks={socialLinks}
      staff={staffRes.data ?? []}
      currentUserId={session.adminUserId}
    />
  );
}
