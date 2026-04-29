import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductDetail } from "./product-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const sb = createClient();
  const { data } = await sb
    .from("products")
    .select("name_lat, brand, description_lat")
    .eq("slug", params.slug)
    .eq("active", true)
    .single();
  if (!data) return { title: "Berbernica Triša · Shop" };
  return {
    title: `${data.name_lat}${data.brand ? " — " + data.brand : ""} · Berbernica Triša`,
    description: data.description_lat?.slice(0, 160) ?? `Kupi ${data.name_lat} u Berbernici Triša.`,
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

  return <ProductDetail product={product} related={related ?? []} />;
}
