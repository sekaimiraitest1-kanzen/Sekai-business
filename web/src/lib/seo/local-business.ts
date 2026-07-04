import type { WorkingHours } from "@/lib/working-hours";
import { formatPhoneE164 } from "@/lib/phone";

const DAY_TO_SCHEMA: Record<keyof WorkingHours, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

type SalonInput = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  workingHours?: WorkingHours | null;
};

type ServiceInput = {
  name_lat: string;
  price: number | null;
};

const FALLBACK_NAME = "Barbershop Vuk";
const FALLBACK_ADDRESS = "Majora Zorana Radosavljevića 138, Beograd";
const FALLBACK_PHONE = "060 1424576";
const FALLBACK_EMAIL = "sekaimiraitest1@gmail.com";

export function buildLocalBusinessJsonLd({
  salon,
  services,
  siteUrl,
  sameAs,
}: {
  salon: SalonInput;
  services: ServiceInput[];
  siteUrl: string;
  /**
   * Caller-built list of cross-network entity URLs (Instagram, Facebook,
   * TikTok, LinkedIn, X — drawn from `salons.social_links` enabled+filled —
   * plus optionally GBP via `NEXT_PUBLIC_GBP_URL`). Page renderer keeps the
   * source-of-truth so this builder stays decoupled from the social-links
   * domain.
   */
  sameAs?: string[];
}) {
  const fullAddress = salon.address ?? FALLBACK_ADDRESS;
  const [streetPart, cityPart] = fullAddress.split(",").map((s) => s.trim());

  const openingHoursSpecification = salon.workingHours
    ? Object.entries(salon.workingHours)
        .filter(([, hours]) => hours !== null)
        .map(([day, hours]) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: DAY_TO_SCHEMA[day as keyof WorkingHours],
          opens: hours!.open.slice(0, 5),
          closes: hours!.close.slice(0, 5),
        }))
    : [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "10:00",
          closes: "20:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Saturday",
          opens: "10:00",
          closes: "17:00",
        },
      ];

  const offerCatalog =
    services.length > 0
      ? {
          "@type": "OfferCatalog",
          name: "Usluge berbernice",
          itemListElement: services
            .filter((s) => s.price != null)
            .map((s) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: s.name_lat },
              price: s.price,
              priceCurrency: "RSD",
            })),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HairSalon"],
    "@id": `${siteUrl}/#business`,
    name: salon.name ?? FALLBACK_NAME,
    alternateName: ["Barbershop Vuk", "Vuk Barbershop", "Барбершоп Вук"],
    description:
      "Muška berbernica u Batajnici — šišanje, brada, brijanje. Online zakazivanje, bez čekanja.",
    url: siteUrl,
    telephone: formatPhoneE164(salon.phone ?? FALLBACK_PHONE),
    email: salon.email ?? FALLBACK_EMAIL,
    priceRange: "$",
    image: `${siteUrl}/logo-source.png`,
    logo: `${siteUrl}/logo-source.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: streetPart,
      addressLocality: cityPart || "Batajnica",
      addressRegion: "Beograd",
      addressCountry: "RS",
    },
    areaServed: [
      { "@type": "City", name: "Beograd" },
      { "@type": "AdministrativeArea", name: "Batajnica" },
      { "@type": "AdministrativeArea", name: "Zemun" },
    ],
    openingHoursSpecification,
    ...(offerCatalog ? { hasOfferCatalog: offerCatalog } : {}),
    ...(sameAs && sameAs.length > 0 ? { sameAs } : {}),
    foundingDate: "2025-09-02",
    // taxID is the Serbian PIB. Schema.org accepts free-form string; Google's
    // structured-data validator treats this as a strong entity-disambiguation
    // signal alongside the address + name.
    taxID: "RS115240647",
    // identifier emits the matični broj (Business Registry number) as a
    // PropertyValue so structured-data crawlers can match the entity to the
    // Serbian Agency for Business Registers (APR) database.
    identifier: {
      "@type": "PropertyValue",
      propertyID: "MB-RS",
      value: "68208955",
    },
    // TODO: populate aggregateRating from GBP API or a verified source. Not safe to hardcode.
  };
}
