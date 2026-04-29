import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { ShopSubNav } from "../_subnav";
import { KategorijeClient } from "./kategorije-client";

export const dynamic = "force-dynamic";

export default async function KategorijePage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { data } = await sb
    .from("product_categories")
    .select("*")
    .eq("salon_id", session.salonId)
    .order("sort_order");
  return (
    <>
      <ShopSubNav />
      <KategorijeClient categories={data ?? []} />
    </>
  );
}
