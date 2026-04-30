type BreadcrumbItem = {
  name: string;
  path: string; // path beginning with "/"
};

export function buildBreadcrumbJsonLd({
  siteUrl,
  items,
}: {
  siteUrl: string;
  items: BreadcrumbItem[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}
