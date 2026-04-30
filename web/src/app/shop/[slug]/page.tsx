import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductDetail } from "./product-detail";
import { JsonLd } from "@/components/json-ld";
import { buildProductJsonLd } from "@/lib/seo/product";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const sb = createClient();
  const { data } = await sb
    .from("products")
    .select("name_lat, brand, description_lat, image_url")
    .eq("slug", params.slug)
    .eq("active", true)
    .single();
  if (!data) return { title: "Продавница" };
  // Title template in root layout wraps as "%s · Берберница Триша" — return
  // bare product+brand here to avoid duplicating the brand in the final title.
  const title = `${data.name_lat}${data.brand ? " — " + data.brand : ""}`;
  const description = data.description_lat?.slice(0, 160) ?? `Kupi ${data.name_lat} u Berbernici Triša.`;
  return {
    title,
    description,
    alternates: { canonical: `/shop/${params.slug}` },
    openGraph: {
      type: "website",
      url: `/shop/${params.slug}`,
      title,
      description,
      ...(data.image_url ? { images: [{ url: data.image_url, alt: data.name_lat }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const sb = createClient();

  const { data: product } = await sb
    .from("products")
    .select("id, slug, name_sr, name_lat, brand, description_sr, description_lat, price, category, stock, image_url, badge")
    .eq("slug", params.slug)
    .eq("active", true)
    .single();

  if (!product) notFound();

  // Sibling products from the same category (max 4)
  const { data: related } = await sb
    .from("products")
    .select("id, slug, name_sr, name_lat, brand, price, image_url, badge, stock")
    .eq("active", true)
    .eq("category", product.category)
    .neq("id", product.id)
    .limit(4);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const productJsonLd = buildProductJsonLd({ product, siteUrl });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd({
    siteUrl,
    items: [
      { name: "Početna", path: "/" },
      { name: "Prodavnica", path: "/shop" },
      { name: product.name_lat, path: `/shop/${product.slug}` },
    ],
  });

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ProductDetail product={product} related={related ?? []} />
    </>
  );
}
