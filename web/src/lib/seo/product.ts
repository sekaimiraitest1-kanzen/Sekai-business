type ProductInput = {
  slug: string;
  name_lat: string;
  name_sr: string;
  brand: string | null;
  description_lat: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  category: string | null;
};

export function buildProductJsonLd({
  product,
  siteUrl,
}: {
  product: ProductInput;
  siteUrl: string;
}) {
  const url = `${siteUrl}/shop/${product.slug}`;
  const availability =
    product.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  // Best-effort SKU from slug — if/when products.sku column lands, swap to that.
  const sku = `bt-${product.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name_lat,
    alternateName: product.name_sr,
    sku,
    ...(product.brand
      ? { brand: { "@type": "Brand", name: product.brand } }
      : {}),
    ...(product.description_lat ? { description: product.description_lat } : {}),
    ...(product.image_url ? { image: product.image_url } : {}),
    ...(product.category ? { category: product.category } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "RSD",
      price: product.price,
      availability,
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Barbershop Vuk", "@id": `${siteUrl}/#business` },
      // Pickup-only — explicit deliveryMethod helps AIO understand fulfilment.
      availableDeliveryMethod: "https://schema.org/InStorePickup",
      areaServed: { "@type": "City", name: "Beograd" },
    },
  };
}
