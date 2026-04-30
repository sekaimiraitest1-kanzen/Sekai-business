import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";

  return {
    rules: [
      // Default policy for all bots — allow content, block private surfaces.
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/dev/", "/offline"],
      },
      // Anti-training-set: block crawlers whose primary use is dataset
      // ingestion. Googlebot and Bingbot continue to index normally.
      {
        userAgent: ["CCBot", "Google-Extended"],
        disallow: "/",
      },
      // AI search & retrieval bots — explicit allow for citation visibility.
      // Default-open stance per docs/seo/llm-crawler-handling-reference.md.
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "GPTBot",
          "ClaudeBot",
          "anthropic-ai",
          "PerplexityBot",
          "Perplexity-User",
        ],
        allow: "/",
        disallow: ["/admin/", "/api/", "/dev/"],
      },
      // Traditional search engines.
      {
        userAgent: ["Googlebot", "Bingbot"],
        allow: "/",
        disallow: ["/admin/", "/api/", "/dev/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
