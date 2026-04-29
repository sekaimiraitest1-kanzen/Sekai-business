import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { PodesavanjaClient } from "./podesavanja-client";

export const dynamic = "force-dynamic";

const ICAL_SALT = "trisa-ical-feed-v1";

function icalToken(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return crypto.createHash("sha256").update(secret + ICAL_SALT).digest("hex").slice(0, 32);
}

export default async function PodesavanjaPage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { data: announcements } = await sb
    .from("site_announcements")
    .select("*")
    .eq("salon_id", session.salonId)
    .order("created_at", { ascending: false });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const icalUrl = `${baseUrl}/api/ical?t=${icalToken()}`;
  return <PodesavanjaClient announcements={announcements ?? []} email={session.email} icalUrl={icalUrl} />;
}
