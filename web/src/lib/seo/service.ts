type ServiceInput = {
  name_lat: string;
  name_sr?: string | null;
  price: number;
  duration_min: number;
  description_lat?: string | null;
};

/**
 * Build a Schema.org Service[] graph for the booking page. While LocalBusiness
 * already declares hasOfferCatalog with the same offers, AIO extractors weight
 * standalone Service entities higher when answering "what services does X
 * offer" queries — duplicate is intentional for retrieval.
 */
export function buildServiceListJsonLd({
  siteUrl,
  services,
}: {
  siteUrl: string;
  services: ServiceInput[];
}) {
  const businessRef = `${siteUrl}/#business`;

  return {
    "@context": "https://schema.org",
    "@graph": services
      .filter((s) => s.price != null)
      .map((s) => ({
        "@type": "Service",
        name: s.name_lat,
        ...(s.name_sr ? { alternateName: s.name_sr } : {}),
        ...(s.description_lat ? { description: s.description_lat } : {}),
        provider: { "@id": businessRef },
        areaServed: [
          { "@type": "City", name: "Beograd" },
          { "@type": "AdministrativeArea", name: "Batajnica" },
        ],
        offers: {
          "@type": "Offer",
          price: s.price,
          priceCurrency: "RSD",
          url: `${siteUrl}/zakazivanje`,
          availability: "https://schema.org/InStock",
        },
        // Schema.org doesn't have a duration field on Service itself; expose
        // via additionalProperty so AIO can still surface trajanje.
        additionalProperty: {
          "@type": "PropertyValue",
          name: "duration",
          value: `PT${s.duration_min}M`,
        },
      })),
  };
}
