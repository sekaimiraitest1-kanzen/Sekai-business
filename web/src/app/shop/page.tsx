import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ShopClient } from "./shop-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Продавница",
  description: "Препарати и алат за негу косе и браде из Берберница Триша — иста цена као у радњи, без сервисних накнада. Лична преузимања у Батајници.",
  alternates: { canonical: "/shop" },
  openGraph: {
    type: "website",
    url: "/shop",
    title: "Продавница · Берберница Триша",
    description: "Препарати и алат за негу косе и браде. Иста цена као у радњи.",
  },
};

export default async function ShopPage() {
  const sb = createClient();
  const [productsRes, catsRes] = await Promise.all([
    sb.from("products").select("id, slug, name_sr, name_lat, brand, description_sr, description_lat, price, category, stock, image_url, badge").eq("active", true).order("sort_order"),
    sb.from("product_categories").select("slug, name_sr, name_lat").eq("active", true).order("sort_order"),
  ]);
  return <ShopClient products={productsRes.data ?? []} categories={catsRes.data ?? []} />;
}
