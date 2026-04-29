import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { PodesavanjaClient } from "./podesavanja-client";

export const dynamic = "force-dynamic";

export default async function PodesavanjaPage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { data: announcements } = await sb
    .from("site_announcements")
    .select("*")
    .eq("salon_id", session.salonId)
    .order("created_at", { ascending: false });
  return <PodesavanjaClient announcements={announcements ?? []} email={session.email} />;
}
