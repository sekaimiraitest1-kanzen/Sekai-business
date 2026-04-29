import { createClient } from "@/lib/supabase/server";

/**
 * Site-wide announcement banner (mustard bar above the nav).
 *
 * Reads the most recent active row from `site_announcements` (RLS already gates
 * to active=true AND now within [starts_at, ends_at]). Renders nothing if no
 * active banner — when no banner is in the DOM, the nav stays at top: 0 and the
 * hero padding stays at its default. CSS handles the layout shift via adjacent
 * sibling selector + body:has(.site-banner).
 */
export async function SiteBanner() {
  const sb = createClient();
  const { data } = await sb
    .from("site_announcements")
    .select("title_sr, title_lat, body_sr, body_lat")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const titleSr = (data.title_sr ?? "").trim();
  const titleLat = (data.title_lat ?? "").trim();
  const bodySr = (data.body_sr ?? "").trim();
  const bodyLat = (data.body_lat ?? "").trim();

  // Defensive: if the row exists but every field is empty, render nothing.
  if (!titleSr && !titleLat && !bodySr && !bodyLat) return null;

  return (
    <div className="site-banner" role="status" aria-live="polite">
      <span data-sr>
        {titleSr && <span className="site-banner-title">{titleSr}</span>}
        {titleSr && bodySr && <span className="site-banner-sep"> · </span>}
        {bodySr && <span className="site-banner-body">{bodySr}</span>}
      </span>
      <span data-lat>
        {titleLat && <span className="site-banner-title">{titleLat}</span>}
        {titleLat && bodyLat && <span className="site-banner-sep"> · </span>}
        {bodyLat && <span className="site-banner-body">{bodyLat}</span>}
      </span>
    </div>
  );
}
