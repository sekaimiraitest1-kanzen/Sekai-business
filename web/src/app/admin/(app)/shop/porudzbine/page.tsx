import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { ShopSubNav } from "../_subnav";
import { PorudzbineClient } from "./porudzbine-client";

export const dynamic = "force-dynamic";

export default async function PorudzbinePage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { data } = await sb
    .from("orders")
    .select("id, total, status, pickup_note, items, created_at, customers(name, phone, email)")
    .eq("salon_id", session.salonId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <>
      <ShopSubNav />
      <PorudzbineClient orders={data ?? []} />
    </>
  );
}
