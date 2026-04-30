import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const sb = createClient();

  const productsRes = await sb
    .from("products")
    .select("slug")
    .eq("active", true)
    .order("sort_order");

  const products = productsRes.data ?? [];
  const now = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/zakazivanje`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...products.map((p) => ({
      url: `${baseUrl}/shop/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
