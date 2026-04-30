import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BookingFlow } from "./booking-flow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Заказивање термина",
  description: "Закажи термин у Берберници Триша за 30 секунди — изабери услугу и време, потврди СМС-ом. Без налога, без чекања. Батајница, Београд.",
  alternates: { canonical: "/zakazivanje" },
  openGraph: {
    type: "website",
    url: "/zakazivanje",
    title: "Заказивање термина · Берберница Триша",
    description: "Закажи термин за 30 секунди. Изабери услугу, време, потврди.",
  },
};

export default async function ZakazivanjePage() {
  const supabase = createClient();

  const [salonRes, servicesRes] = await Promise.all([
    supabase
      .from("salons")
      .select("id, name, address, working_hours")
      .eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa")
      .single(),
    supabase
      .from("services")
      .select("id, name_sr, name_lat, price, duration_min")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const services = servicesRes.data ?? [];
  const salon = salonRes.data;

  return (
    <BookingFlow
      services={services}
      salonId={salon?.id ?? ""}
      salonAddress={salon?.address ?? ""}
      workingHours={salon?.working_hours ?? null}
    />
  );
}
