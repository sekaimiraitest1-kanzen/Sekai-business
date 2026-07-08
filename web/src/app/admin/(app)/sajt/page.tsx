import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { CONTENT_DEFAULTS } from "@/lib/site-content-defaults";
import { SajtClient } from "./sajt-client";

export const dynamic = "force-dynamic";

export default async function SajtPage() {
  const session = await requireAdmin();
  const sb = createAdminClient();

  const [salonRes, contentRes] = await Promise.all([
    sb.from("salons").select("name, address, phone, email, working_hours").eq("id", session.salonId).single(),
    sb.from("site_content").select("key, value_sr, value_lat").eq("salon_id", session.salonId),
  ]);

  // Rows that were never saved don't exist in the table yet, but the
  // homepage still shows hardcoded fallback text for them (CONTENT_DEFAULTS)
  // — pre-fill those same defaults here so the editor never looks blank
  // when the site actually has text on it.
  const dbContent = contentRes.data ?? [];
  const savedKeys = new Set(dbContent.map((r) => r.key));
  const content = [
    ...dbContent,
    ...Object.entries(CONTENT_DEFAULTS)
      .filter(([key]) => !savedKeys.has(key))
      .map(([key, val]) => ({ key, value_sr: val.sr, value_lat: val.lat })),
  ];

  return (
    <SajtClient
      salon={salonRes.data ?? null}
      content={content}
    />
  );
}
