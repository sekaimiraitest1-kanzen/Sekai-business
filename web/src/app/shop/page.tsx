import { createClient } from "@/lib/supabase/server";
import { ShopClient } from "./shop-client";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const sb = createClient();
  const [productsRes, catsRes] = await Promise.all([
    sb.from("products").select("id, slug, name, brand, description, price, category, stock, image_url, badge").eq("active", true).order("sort_order"),
    sb.from("product_categories").select("slug, name_sr, name_lat").eq("active", true).order("sort_order"),
  ]);
  return <ShopClient products={productsRes.data ?? []} categories={catsRes.data ?? []} />;
}
