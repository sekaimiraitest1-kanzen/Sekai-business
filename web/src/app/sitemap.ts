import type { MetadataRoute } from "next";

/**
 * Render at request time, not build time. Vercel was failing the build by
 * trying to prerender this with Supabase env potentially unset; switching to
 * "force-dynamic" defers the query until the first crawler hits the URL,
 * by which point the env is always present (Vercel injects production env
 * before booting the function).
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600; // edge cache 1h between requests

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const now = new Date();

  // Static routes always present.
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/zakazivanje`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/privatnost`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/uslovi-koriscenja`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Product routes — best-effort. If Supabase env isn't configured (preview
  // before env wired, build-time prerender fallback) we still emit a valid
  // sitemap with the static routes rather than 500-ing the entire endpoint.
  let products: { slug: string }[] = [];
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { createClient } = await import("@/lib/supabase/server");
      const sb = createClient();
      const productsRes = await sb
        .from("products")
        .select("slug")
        .eq("active", true)
        .order("sort_order");
      products = productsRes.data ?? [];
    }
  } catch {
    // Swallow — sitemap should never crash the response. Static routes are
    // emitted regardless. Search engines re-crawl, so missing PDPs from one
    // sitemap render are picked up next time.
  }

  return [
    ...staticEntries,
    ...products.map((p) => ({
      url: `${baseUrl}/shop/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
