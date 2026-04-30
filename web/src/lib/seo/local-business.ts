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

const FALLBACK_NAME = "Berbernica Triša";
const FALLBACK_ADDRESS = "Majora Zorana Radosavljevića 226b, Batajnica";
const FALLBACK_PHONE = "065 9003 742";
const FALLBACK_EMAIL = "berbernicatrisa@gmail.com";

export function buildLocalBusinessJsonLd({
  salon,
  services,
  siteUrl,
}: {
  salon: SalonInput;
  services: ServiceInput[];
  siteUrl: string;
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
          opens: "09:00",
          closes: "20:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Saturday",
          opens: "09:00",
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
    alternateName: ["Berbernica Trisha", "Trisha Barbershop", "Берберница Триша"],
    description:
      "Tradicionalna muška berbernica u Batajnici — šišanje, brada, brijanje. Online zakazivanje, bez čekanja.",
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
    // TODO(B.2): populate sameAs once Instagram URL is fixed and GBP/Facebook URLs collected.
    // TODO(B.x): populate aggregateRating from GBP API or a verified source. Not safe to hardcode.
  };
}
