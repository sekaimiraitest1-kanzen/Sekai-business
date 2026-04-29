import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { SajtClient } from "./sajt-client";

export const dynamic = "force-dynamic";

export default async function SajtPage() {
  const session = await requireAdmin();
  const sb = createAdminClient();

  const [salonRes, contentRes] = await Promise.all([
    sb.from("salons").select("name, address, phone, email, working_hours").eq("id", session.salonId).single(),
    sb.from("site_content").select("key, value_sr, value_lat").eq("salon_id", session.salonId),
  ]);

  return (
    <SajtClient
      salon={salonRes.data ?? null}
      content={contentRes.data ?? []}
    />
  );
}
