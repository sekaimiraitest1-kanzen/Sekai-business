import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ShopClient } from "./shop-client";
import { JsonLd } from "@/components/json-ld";
import { buildItemListJsonLd } from "@/lib/seo/item-list";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumbs";

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

  const products = productsRes.data ?? [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const itemListJsonLd = buildItemListJsonLd({
    siteUrl,
    name: "Barbershop Vuk — Prodavnica",
    products: products.map((p) => ({ slug: p.slug, name_lat: p.name_lat, price: p.price, image_url: p.image_url })),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd({
    siteUrl,
    items: [
      { name: "Početna", path: "/" },
      { name: "Prodavnica", path: "/shop" },
    ],
  });

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ShopClient products={products} categories={catsRes.data ?? []} />
    </>
  );
}
