import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BookingFlow } from "./booking-flow";
import { JsonLd } from "@/components/json-ld";
import { buildServiceListJsonLd } from "@/lib/seo/service";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Zakazivanje termina",
  description: "Zakaži termin u Barbershop Vuk za 30 sekundi — izaberi uslugu i vreme, potvrdi SMS-om. Bez naloga, bez čekanja. Batajnica, Beograd.",
  alternates: { canonical: "/zakazivanje" },
  openGraph: {
    type: "website",
    url: "/zakazivanje",
    title: "Zakazivanje termina · Barbershop Vuk",
    description: "Zakaži termin za 30 sekundi. Izaberi uslugu, vreme, potvrdi.",
  },
};

export default async function ZakazivanjePage({ searchParams }: { searchParams: { barber?: string } }) {
  const supabase = createClient();

  const [salonRes, servicesRes, barbersRes] = await Promise.all([
    supabase
      .from("salons")
      .select("id, name, address, working_hours")
      .eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa")
      .single(),
    supabase
      .from("services")
      .select("id, name_sr, name_lat, price, duration_min, description_sr, description_lat")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("public_barbers")
      .select("id, display_name, photo_url, role_title_sr, role_title_lat, specialty_sr, specialty_lat")
      .order("public_sort_order", { ascending: true }),
  ]);

  const services = servicesRes.data ?? [];
  const barbers = barbersRes.data ?? [];
  const salon = salonRes.data;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const serviceListJsonLd = buildServiceListJsonLd({
    siteUrl,
    services: services.map((s) => ({
      name_lat: s.name_lat,
      name_sr: s.name_sr,
      price: s.price,
      duration_min: s.duration_min,
      description_lat: s.description_lat,
    })),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd({
    siteUrl,
    items: [
      { name: "Početna", path: "/" },
      { name: "Zakazivanje", path: "/zakazivanje" },
    ],
  });

  return (
    <>
      <JsonLd data={serviceListJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <BookingFlow
        services={services}
        barbers={barbers}
        salonId={salon?.id ?? ""}
        salonAddress={salon?.address ?? ""}
        workingHours={salon?.working_hours ?? null}
        initialBarberId={searchParams.barber}
      />
    </>
  );
}
