import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description: "Saveti za stil, negu brade i kose iz Barbershop Vuk.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const sb = createClient();
  const { data: posts } = await sb
    .from("blog_posts")
    .select("slug, title_sr, title_lat, excerpt_sr, excerpt_lat, cover_image_url, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });

  return (
    <>
      <SiteNav />
      <main id="main-content" className="section" style={{ background: "var(--brown-950)", minHeight: "60vh" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="section-label"><span>BLOG</span></div>
          <h1 className="section-title" style={{ color: "var(--cream)" }}>
            <span data-sr>Our blog.</span>
            <span data-lat>Naš blog.</span>
          </h1>
          {(!posts || posts.length === 0) && (
            <p style={{ color: "#8B857C" }}>
              <span data-sr>No posts yet.</span>
              <span data-lat>Još uvek nema članaka.</span>
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {(posts ?? []).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ position: "relative", height: 220, overflow: "hidden", background: "var(--brown-900)" }}>
                  {p.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <h3 style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 19, textTransform: "uppercase", margin: "22px 0 10px" }}>
                  <span data-sr>{p.title_sr}</span>
                  <span data-lat>{p.title_lat}</span>
                </h3>
                {p.published_at && (
                  <span style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--mustard)" }}>
                    {new Date(p.published_at).toLocaleDateString("sr-RS", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
