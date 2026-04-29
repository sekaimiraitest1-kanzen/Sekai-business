import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { MusterijeClient } from "./musterije-client";

export const dynamic = "force-dynamic";

export default async function MusterijePage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await requireAdmin();
  const sb = createAdminClient();

  let query = sb
    .from("customers")
    .select("id, name, phone, email, no_show_count, no_show_flag, last_visit_date, created_at")
    .eq("salon_id", session.salonId)
    .order("created_at", { ascending: false });

  const q = searchParams.q?.trim();
  if (q) {
    query = query.or(`phone.ilike.%${q}%,name.ilike.%${q}%`);
  }

  const { data } = await query.limit(200);

  return <MusterijeClient customers={data ?? []} initialSearch={q ?? ""} />;
}
