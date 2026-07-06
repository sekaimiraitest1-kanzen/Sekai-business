type BlogPostInput = {
  slug: string;
  title_lat: string;
  excerpt_lat: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

export function buildArticleJsonLd({ post, siteUrl }: { post: BlogPostInput; siteUrl: string }) {
  const url = `${siteUrl}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title_lat,
    ...(post.excerpt_lat ? { description: post.excerpt_lat } : {}),
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    author: { "@type": "Organization", name: "Barbershop Vuk" },
    publisher: { "@type": "Organization", name: "Barbershop Vuk", "@id": `${siteUrl}/#business` },
    mainEntityOfPage: url,
  };
}
