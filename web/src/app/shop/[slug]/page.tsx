import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductDetail } from "./product-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const sb = createClient();
  const { data } = await sb
    .from("products")
    .select("name, brand, description")
    .eq("slug", params.slug)
    .eq("active", true)
    .single();
  if (!data) return { title: "Berbernica Triša · Shop" };
  return {
    title: `${data.name}${data.brand ? " — " + data.brand : ""} · Berbernica Triša`,
    description: data.description?.slice(0, 160) ?? `Kupi ${data.name} u Berbernici Triša.`,
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const sb = createClient();

  const { data: product } = await sb
    .from("products")
    .select("id, slug, name, brand, description, price, category, stock, image_url, badge")
    .eq("slug", params.slug)
    .eq("active", true)
    .single();

  if (!product) notFound();

  // Sibling products from the same category (max 4)
  const { data: related } = await sb
    .from("products")
    .select("id, slug, name, brand, price, image_url, badge, stock")
    .eq("active", true)
    .eq("category", product.category)
    .neq("id", product.id)
    .limit(4);

  return <ProductDetail product={product} related={related ?? []} />;
}
