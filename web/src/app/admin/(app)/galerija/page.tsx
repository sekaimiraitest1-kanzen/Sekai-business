import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { GalerijaClient } from "./galerija-client";

export const dynamic = "force-dynamic";

export default async function GalerijaPage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { data } = await sb
    .from("gallery_images")
    .select("id, url, alt_sr, alt_lat, sort_order, size")
    .eq("salon_id", session.salonId)
    .order("sort_order", { ascending: true });
  return <GalerijaClient images={data ?? []} />;
}
