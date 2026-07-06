import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { buildArticleJsonLd } from "@/lib/seo/blog";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const sb = createClient();
  const { data } = await sb
    .from("blog_posts")
    .select("title_lat, excerpt_lat, cover_image_url")
    .eq("slug", params.slug)
    .eq("published", true)
    .single();
  if (!data) return { title: "Blog" };
  return {
    title: data.title_lat,
    description: data.excerpt_lat ?? undefined,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      type: "article",
      url: `/blog/${params.slug}`,
      title: data.title_lat,
      description: data.excerpt_lat ?? undefined,
      ...(data.cover_image_url ? { images: [{ url: data.cover_image_url, alt: data.title_lat }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const sb = createClient();
  const { data: post } = await sb
    .from("blog_posts")
    .select("slug, title_sr, title_lat, excerpt_lat, body_sr, body_lat, cover_image_url, published_at")
    .eq("slug", params.slug)
    .eq("published", true)
    .single();

  if (!post) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const articleJsonLd = buildArticleJsonLd({ post, siteUrl });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd({
    siteUrl,
    items: [
      { name: "Početna", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title_lat, path: `/blog/${post.slug}` },
    ],
  });

  const paragraphsLat = post.body_lat.split(/\n\s*\n/).filter(Boolean);
  const paragraphsSr = post.body_sr.split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <SiteNav />
      <main id="main-content" style={{ background: "var(--brown-950)", minHeight: "60vh" }}>
        <article style={{ maxWidth: 760, margin: "0 auto", padding: "96px 40px" }}>
          {post.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.cover_image_url} alt="" style={{ width: "100%", height: 360, objectFit: "cover", marginBottom: 32 }} />
          )}
          <h1 style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: "clamp(32px,5vw,48px)", textTransform: "uppercase", color: "var(--cream)", marginBottom: 16 }}>
            <span data-sr>{post.title_sr}</span>
            <span data-lat>{post.title_lat}</span>
          </h1>
          {post.published_at && (
            <span style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--mustard)", display: "block", marginBottom: 32 }}>
              {new Date(post.published_at).toLocaleDateString("sr-RS", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
            </span>
          )}
          <div style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(239,233,221,.85)" }} data-sr>
            {paragraphsSr.map((p: string, i: number) => <p key={i} style={{ marginBottom: 20 }}>{p}</p>)}
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(239,233,221,.85)" }} data-lat>
            {paragraphsLat.map((p: string, i: number) => <p key={i} style={{ marginBottom: 20 }}>{p}</p>)}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
