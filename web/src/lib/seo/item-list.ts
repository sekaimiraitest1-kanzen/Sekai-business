type ListItemInput = {
  slug: string;
  name_lat: string;
  price: number;
  image_url: string | null;
};

/**
 * Build a Schema.org ItemList for a paginated product collection page (/shop).
 * Each item points back at its PDP url so AIO crawlers can resolve to the
 * Product schema on the linked page.
 */
export function buildItemListJsonLd({
  siteUrl,
  name,
  products,
}: {
  siteUrl: string;
  name: string;
  products: ListItemInput[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${siteUrl}/shop/${p.slug}`,
      name: p.name_lat,
    })),
  };
}
