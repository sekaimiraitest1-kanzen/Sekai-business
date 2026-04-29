import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { ShopSubNav } from "../_subnav";
import { ProizvodiClient } from "./proizvodi-client";

export const dynamic = "force-dynamic";

export default async function ProizvodiPage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const [productsRes, catsRes] = await Promise.all([
    sb.from("products").select("id, slug, name_sr, name_lat, brand, description_sr, description_lat, price, category, stock, active, image_url, badge, sort_order").eq("salon_id", session.salonId).order("sort_order", { ascending: true }),
    sb.from("product_categories").select("slug, name_sr, name_lat").eq("salon_id", session.salonId).order("sort_order"),
  ]);

  return (
    <>
      <ShopSubNav />
      <ProizvodiClient products={productsRes.data ?? []} categories={catsRes.data ?? []} />
    </>
  );
}
