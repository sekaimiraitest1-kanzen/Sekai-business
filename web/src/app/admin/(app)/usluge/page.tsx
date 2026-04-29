import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { UslugeClient } from "./usluge-client";

export const dynamic = "force-dynamic";

export default async function UslugePage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { data } = await sb
    .from("services")
    .select("id, name_sr, name_lat, price, duration_min, active, sort_order")
    .eq("salon_id", session.salonId)
    .order("sort_order", { ascending: true });
  return <UslugeClient services={data ?? []} />;
}
