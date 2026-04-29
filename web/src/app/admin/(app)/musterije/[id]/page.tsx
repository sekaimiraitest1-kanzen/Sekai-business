import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { CustomerProfile } from "./customer-profile";

// Supabase types (without codegen) infer the embedded `services` FK as an array,
// but the runtime returns a single object because services↔bookings is many-to-one.
// Until we run `supabase gen types typescript` (deferred to a session with CLI auth),
// we cast at the page boundary. Replace with generated types when available.
type BookingRow = {
  id: string;
  date: string;
  time_slot: string;
  status: string;
  services: { name_sr: string | null; name_lat: string | null; price: number | null } | null;
};

export const dynamic = "force-dynamic";

export default async function MusterijaDetail({ params }: { params: { id: string } }) {
  const session = await requireAdmin();
  const sb = createAdminClient();

  const [custRes, bookingsRes] = await Promise.all([
    sb.from("customers").select("*").eq("id", params.id).eq("salon_id", session.salonId).single(),
    sb
      .from("bookings")
      .select("id, date, time_slot, status, services(name_sr, name_lat, price)")
      .eq("customer_id", params.id)
      .order("date", { ascending: false })
      .limit(50),
  ]);

  if (custRes.error || !custRes.data) {
    return (
      <div className="adm-empty">
        <div>Nije pronađeno.</div>
        <Link href="/admin/musterije" className="adm-btn adm-btn-secondary" style={{ marginTop: 16, display: "inline-flex" }}>← Nazad</Link>
      </div>
    );
  }

  return <CustomerProfile customer={custRes.data} bookings={(bookingsRes.data ?? []) as unknown as BookingRow[]} />;
}
