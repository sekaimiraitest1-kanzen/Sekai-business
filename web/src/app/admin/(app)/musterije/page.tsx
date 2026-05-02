import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { isStaff } from "@/lib/auth/admin-session";
import { MusterijeClient } from "./musterije-client";

export const dynamic = "force-dynamic";

export default async function MusterijePage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const staffMode = isStaff(session);

  // Staff scope: only customers they have at least one done booking with.
  // Owner sees everyone in the salon.
  let allowedIds: Set<string> | null = null;
  if (staffMode) {
    const { data } = await sb
      .from("bookings")
      .select("customer_id")
      .eq("salon_id", session.salonId)
      .eq("staff_id", session.adminUserId)
      .eq("status", "done");
    allowedIds = new Set((data ?? []).map((r) => r.customer_id as string).filter(Boolean));
    if (allowedIds.size === 0) {
      return <MusterijeClient customers={[]} initialSearch={searchParams.q ?? ""} />;
    }
  }

  let query = sb
    .from("customers")
    .select("id, name, phone, email, no_show_count, no_show_flag, last_visit_date, created_at")
    .eq("salon_id", session.salonId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (allowedIds) query = query.in("id", Array.from(allowedIds));

  const q = searchParams.q?.trim();
  if (q) {
    // M5: PostgREST .or() parser uses commas + parens as syntax separators —
    // raw user input would break it (and risks injection of additional filter
    // expressions). Strip those characters before interpolation.
    const safe = q.replace(/[,()*]/g, "").slice(0, 60);
    if (safe) {
      query = query.or(`phone.ilike.%${safe}%,name.ilike.%${safe}%`);
    }
  }

  const { data } = await query.limit(200);

  return <MusterijeClient customers={data ?? []} initialSearch={q ?? ""} />;
}
