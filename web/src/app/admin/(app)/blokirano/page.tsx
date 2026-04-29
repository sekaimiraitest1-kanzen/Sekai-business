import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { todayKey } from "@/lib/datetime";
import { BlokiranoClient } from "./blokirano-client";

export const dynamic = "force-dynamic";

export default async function BlokiranoPage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  // Show today + future blocks. Past blocks are useless and noise.
  const { data } = await sb
    .from("blocked_slots")
    .select("id, date, time_slot, reason, created_at")
    .eq("salon_id", session.salonId)
    .gte("date", todayKey())
    .order("date", { ascending: true })
    .order("time_slot", { ascending: true, nullsFirst: true });
  return <BlokiranoClient blocks={data ?? []} />;
}
