import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { NewBookingForm } from "./new-booking-form";

export const dynamic = "force-dynamic";

export default async function NoviTerminPage() {
  const session = await requireAdmin();
  const sb = createAdminClient();

  const [servicesRes, salonRes, recentRes] = await Promise.all([
    sb.from("services").select("id, name_sr, name_lat, duration_min, price").eq("salon_id", session.salonId).eq("active", true).order("sort_order"),
    sb.from("salons").select("working_hours").eq("id", session.salonId).single(),
    sb.from("customers").select("id, name, phone").eq("salon_id", session.salonId).order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <NewBookingForm
      services={servicesRes.data ?? []}
      workingHours={salonRes.data?.working_hours ?? null}
      recentCustomers={recentRes.data ?? []}
    />
  );
}
