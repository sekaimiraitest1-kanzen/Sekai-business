import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteBanner } from "@/components/site-banner";
import { JsonLd } from "@/components/json-ld";
import { createClient } from "@/lib/supabase/server";
import { buildLocalBusinessJsonLd } from "@/lib/seo/local-business";
import { parseSocialLinks, visibleLinks } from "@/lib/social-links";
import { HeroCarousel } from "./hero-carousel";

type WorkingHoursMap = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string } | null>;

export default async function HomePage() {
  const supabase = createClient();

  // Read salon + services + gallery + site_content + barbers + blog in parallel
  const [salonRes, servicesRes, galleryRes, contentRes, barbersRes, blogRes] = await Promise.all([
    supabase.from("salons").select("name, address, phone, email, working_hours, social_links").eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa").single(),
    supabase.from("services").select("name_sr, name_lat, price, duration_min, featured, description_sr, description_lat, meta_sr, meta_lat").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("gallery_images").select("id, url, alt_sr, alt_lat, sort_order, size").order("sort_order", { ascending: true }),
    supabase.from("site_content").select("key, value_sr, value_lat"),
    supabase.from("public_barbers").select("id, display_name, photo_url, bio_sr, bio_lat, specialty_sr, specialty_lat, role_title_sr, role_title_lat").order("public_sort_order", { ascending: true }),
    supabase.from("blog_posts").select("slug, title_sr, title_lat, cover_image_url, published_at").eq("published", true).order("published_at", { ascending: false }).limit(3),
  ]);

  const salon = salonRes.data;
  const barbers = barbersRes.data ?? [];
  const blogPosts = blogRes.data ?? [];
  // Featured / VIP services always render LAST so the gold-accent block
  // anchors the bottom of the list. Admin can add new regular services in
  // any sort_order — they'll never push the VIP block out of place.
  const allServices = servicesRes.data ?? [];
  const services = [
    ...allServices.filter((s) => !s.featured),
    ...allServices.filter((s) => !!s.featured),
  ];
  // Build a Map of site_content rows so render code can do `content.get("hero_title")?.sr ?? FALLBACK`.
  // FALLBACK preserves the original hardcoded text if the row is missing or empty — admin /admin/sajt
  // edits propagate within next revalidation interval (≤ 5 min).
  const content = new Map<string, { sr: string; lat: string }>(
    (contentRes.data ?? [])
      .filter((r) => r.value_sr || r.value_lat)
      .map((r) => [r.key, { sr: r.value_sr ?? "", lat: r.value_lat ?? "" }])
  );
  const getC = (key: string, fallbackSr: string, fallbackLat: string) => ({
    sr: content.get(key)?.sr || fallbackSr,
    lat: content.get(key)?.lat || fallbackLat,
  });

  const aboutStory = getC("about_story", "Forget waiting in line and flipping through old magazines. Opened in 2024, we combined honest craft in the barber chair with technology that respects your time. No philosophizing here: the focus is on a sharp fade, precise beard work, and healthy-looking hair.", "Tvoje vreme je previše vredno da bi ga trošio na čekanje u salonu. Od 2024. godine spajamo vrhunsku tradiciju stare škole i pametna digitalna rešenja za zakazivanje. Bez suvišnog filozofiranja i komplikovanja – garantujemo ti hirurški precizne konture, brutalan fade i savršeno zdravu kosu.");

  // Use DB gallery if seeded; otherwise fall back to the legacy hardcoded list so
  // the section never goes empty (BUG-6 fix). DB values come from /admin/galerija.
  // CSS classes g1..g6 define the asymmetric grid spans (g1 is 2×2 large, g2/g3/g6 span 2 cols, g4/g5 span 1).
  // Map DB rows in sort_order to those classes positionally — admin's drag-reorder controls layout order.
  // GALLERY const fallback covers fresh-deploy / DB-outage scenarios.
  const gallery = (galleryRes.data && galleryRes.data.length > 0)
    ? galleryRes.data.slice(0, 6).map((row, i) => ({
        cls: `g${i + 1}`,
        src: row.url,
        altSr: row.alt_sr ?? "",
        altLat: row.alt_lat ?? "",
      }))
    : GALLERY.map((g) => ({ cls: g.cls, src: g.src, altSr: g.alt, altLat: g.alt }));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const socialLinks = parseSocialLinks((salon as unknown as { social_links?: unknown })?.social_links);
  // sameAs only emits enabled+filled platforms — keeps JSON-LD clean while
  // matching the visual footer surface. GBP comes from a server-only env var
  // because it's not surfaced as a footer icon (it's a directory listing,
  // not a social profile).
  const sameAsUrls = [
    ...visibleLinks(socialLinks).map((l) => l.url),
    process.env.NEXT_PUBLIC_GBP_URL,
  ].filter((u): u is string => typeof u === "string" && u.trim() !== "");
  const localBusinessJsonLd = buildLocalBusinessJsonLd({
    salon: {
      name: salon?.name,
      address: salon?.address,
      phone: salon?.phone,
      email: salon?.email,
      workingHours: salon?.working_hours ?? null,
    },
    services: services.map((s) => ({ name_lat: s.name_lat, price: s.price })),
    siteUrl,
    sameAs: sameAsUrls,
  });

  const workingHours = (salon?.working_hours ?? null) as WorkingHoursMap | null;

  return (
    <>
      <JsonLd data={localBusinessJsonLd} />
      <SiteBanner />
      <SiteNav />

      <main id="main-content">

      {/* ── HERO ────────────────────────────────────────── */}
      <header id="pocetna" className="hero-v2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero-v2-bg" src="/hero-vuk.webp" alt="Barbershop Vuk" />
        <div className="hero-v2-scrim" />

        <HeroCarousel
          address={salon?.address ?? "Majora Zorana Radosavljevića 138, Beograd 11273"}
          phone={salon?.phone ?? "060 1424576"}
        />

        <div className="hero-v2-rail" />
        <div className="hero-v2-socials">
          {socialLinks.instagram.enabled && socialLinks.instagram.url.trim() !== "" && (
            <a href={socialLinks.instagram.url} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
            </a>
          )}
          {socialLinks.facebook.enabled && socialLinks.facebook.url.trim() !== "" && (
            <a href={socialLinks.facebook.url} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
            </a>
          )}
        </div>
      </header>

      {/* ── O NAMA ──────────────────────────────────────── */}
      <section id="onama" className="section onama" style={{ position: "relative" }}>
        <div className="ghost-watermark" style={{ top: 64, fontSize: 170 }}>BARBERVUK</div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80 }}>
          <div>
            <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>ABOUT</span><span className="kicker-label" data-lat>O NAMA</span></div>
            <h2 className="section-title" style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: 52, lineHeight: 1 }}>
              <span data-sr>Professional barbershop<br />for men only.</span>
              <span data-lat>Profesionalna<br />berbernica<br />samo za muškarce</span>
            </h2>
          </div>
          <div>
            <p style={{ margin: "0 0 40px", fontSize: 16, lineHeight: 1.75, color: "var(--brown-700)" }}>
              <span data-sr>{aboutStory.sr}</span>
              <span data-lat>{aboutStory.lat}</span>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, marginBottom: 42 }}>
              <div>
                <div style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 30, letterSpacing: ".02em" }}>OD 2019.</div>
                <div style={{ height: 1, background: "rgba(26,24,21,.14)", margin: "14px 0" }} />
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#8B857C" }}>
                  <span data-sr>Years of loyal customers and word-of-mouth referrals.</span>
                  <span data-lat>Godinama gradimo stalne mušterije i preporuke od usta do usta.</span>
                </p>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 30, letterSpacing: ".02em" }}>
                  1000+ <span style={{ color: "var(--mustard)" }}>KLIJENATA</span>
                </div>
                <div style={{ height: 1, background: "rgba(26,24,21,.14)", margin: "14px 0" }} />
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#8B857C" }}>
                  <span data-sr>Average 4.9 rating from over 120 reviews.</span>
                  <span data-lat>Prosečna ocena 4.9 na osnovu preko 120 recenzija.</span>
                </p>
              </div>
            </div>
            <a href="#usluge" className="btn-primary">
              <span data-sr>LEARN MORE</span><span data-lat>DETALJNIJE</span> →
            </a>
          </div>
        </div>
      </section>

      {/* ── USLUGE ──────────────────────────────────────── */}
      <section id="usluge" className="section usluge" style={{ position: "relative" }}>
        <div className="ghost-watermark" style={{ top: 0, fontSize: 150 }} data-sr>SERVICES</div>
        <div className="ghost-watermark" style={{ top: 0, fontSize: 150 }} data-lat>USLUGE</div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
          <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>SERVICES</span><span className="kicker-label" data-lat>USLUGE</span></div>
          <h2 className="section-title" style={{ color: "var(--cream)", fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: 52, lineHeight: 1 }}>
            <span data-sr>What we offer</span><span data-lat>Šta nudimo</span>
          </h2>
          <p style={{ margin: "0 0 60px", maxWidth: 520, fontSize: 15, lineHeight: 1.65, color: "#8B857C" }}>
            <span data-sr>Haircuts, beard, and shaving — everything for a tidy look. Cash or card, no surcharges.</span>
            <span data-lat>Šišanje, brada i brijanje — sve što treba za uredan izgled. Plaćanje gotovinom ili karticom, bez doplata.</span>
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "52px 56px" }}>
            {(services.length > 0 ? services : DEFAULT_SERVICES_GRID).map((s, i) => {
              const nameSr = "name_sr" in s ? s.name_sr : s.nameSr;
              const nameLat = "name_lat" in s ? s.name_lat : s.nameLat;
              const descSr = "description_sr" in s ? s.description_sr : undefined;
              const descLat = "description_lat" in s ? s.description_lat : undefined;
              return (
                <div key={i} style={{ display: "flex", gap: 20 }}>
                  <span className="icon-tile">{serviceIconSvg(nameLat)}</span>
                  <div>
                    <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 20, letterSpacing: ".02em", textTransform: "uppercase", color: "var(--cream)" }}>
                      <span data-sr>{nameSr}</span><span data-lat>{nameLat}</span>
                    </h3>
                    {(descSr || descLat) && (
                      <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.6, color: "#8B857C" }}>
                        <span data-sr>{descSr ?? ""}</span><span data-lat>{descLat ?? ""}</span>
                      </p>
                    )}
                    <span style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 13, letterSpacing: ".06em", color: "var(--mustard)" }}>
                      <span data-sr>FROM </span><span data-lat>OD </span>{s.price} RSD
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 40, display: "flex", justifyContent: "flex-end" }}>
            <a href="/zakazivanje" className="btn-primary"><span data-sr>BOOK NOW →</span><span data-lat>ZAKAŽI TERMIN →</span></a>
          </div>
        </div>
      </section>

      {/* ── TIM / RADNO VREME ───────────────────────────── */}
      <section className="band-section">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="band-bg" src="/legacy/uploads/IMG_0025.jpeg" alt="" />
        <div className="band-scrim" />
        <div className="band-content">
          <div>
            <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>OUR TEAM</span><span className="kicker-label" data-lat>NAŠ TIM</span></div>
            <h2 style={{ margin: "0 0 22px", fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, fontSize: 46, lineHeight: 1, textTransform: "uppercase", color: "var(--cream)" }}>
              <span data-sr>A team of pros<br />is waiting for you</span>
              <span data-lat>Tim profesionalaca<br />te čeka</span>
            </h2>
            <p style={{ margin: "0 0 32px", maxWidth: 420, fontSize: 15, lineHeight: 1.7, color: "#c9c3b8" }}>
              <span data-sr>No waiting in line. Book a time, show up, and let us handle the rest.</span>
              <span data-lat>Bez čekanja u redovima. Zakaži termin, dođi i prepusti se — mi ćemo se pobrinuti za ostalo.</span>
            </p>
            <a href="#berberi" className="btn-primary"><span data-sr>BOOK NOW →</span><span data-lat>ZAKAŽI TERMIN →</span></a>
          </div>
          <div>
            <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>OPENING HOURS</span><span className="kicker-label" data-lat>RADNO VREME</span></div>
            <div className="hours-grid-v2">
              {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((key) => {
                const labels: Record<string, { sr: string; lat: string }> = {
                  mon: { sr: "MON", lat: "PON" }, tue: { sr: "TUE", lat: "UTO" }, wed: { sr: "WED", lat: "SRE" },
                  thu: { sr: "THU", lat: "ČET" }, fri: { sr: "FRI", lat: "PET" }, sat: { sr: "SAT", lat: "SUB" }, sun: { sr: "SUN", lat: "NED" },
                };
                const wh = workingHours?.[key];
                return (
                  <div key={key} className="row">
                    <span className="day" style={{ color: key === "sun" ? "var(--mustard)" : undefined }}>
                      <span data-sr>{labels[key].sr}</span><span data-lat>{labels[key].lat}</span>
                    </span>
                    {wh ? (
                      <span style={{ color: "#c9c3b8" }}>{wh.open.slice(0, 5)} — {wh.close.slice(0, 5)}</span>
                    ) : (
                      <span style={{ color: "#6f6a62" }}><span data-sr>CLOSED</span><span data-lat>ZATVORENO</span></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── BERBERI ─────────────────────────────────────── */}
      <section id="berberi" className="section">
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>OUR BARBERS</span><span className="kicker-label" data-lat>MAJSTORI</span></div>
          <h2 className="section-title" style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: 52, lineHeight: 1 }}>
            <span data-sr>Pick your barber</span><span data-lat>Izaberi svog majstora</span>
          </h2>
          <p style={{ margin: "0 0 56px", maxWidth: 520, fontSize: 15, lineHeight: 1.65, color: "#8B857C" }}>
            <span data-sr>Two master barbers work at Vuk&apos;s. Book directly with the one you want — each appointment goes on his own schedule.</span>
            <span data-lat>Kod Vuka rade dvojica majstora. Zakaži direktno kod onog kod koga želiš — svaki termin ide na njegov raspored.</span>
          </p>

          {barbers.length > 0 && (
            <div className="barber-grid">
              {barbers.map((b) => (
                <div key={b.id} className="barber-card">
                  <div className="barber-photo">
                    {b.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.photo_url} alt={b.display_name ?? ""} />
                    )}
                    <div className="barber-photo-scrim" />
                    {(b.specialty_sr || b.specialty_lat) && (
                      <span className="barber-chip">
                        <span data-sr>{b.specialty_sr}</span><span data-lat>{b.specialty_lat}</span>
                      </span>
                    )}
                  </div>
                  <div className="barber-body">
                    <h3 className="barber-name">{b.display_name}</h3>
                    <div className="barber-role"><span data-sr>{b.role_title_sr}</span><span data-lat>{b.role_title_lat}</span></div>
                    {(b.bio_sr || b.bio_lat) && (
                      <p className="barber-bio"><span data-sr>{b.bio_sr}</span><span data-lat>{b.bio_lat}</span></p>
                    )}
                    <a href={`/zakazivanje?barber=${b.id}`} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                      <span data-sr>Book with {b.display_name} →</span>
                      <span data-lat>Zakaži kod {b.display_name} →</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── GALERIJA ────────────────────────────────────── */}
      <section className="galerija" id="galerija">
        <div className="galerija-header">
          <div>
            <div className="section-label" style={{ color: "var(--mustard)" }}>
              <span data-sr>§ 04 · GALLERY</span>
              <span data-lat>§ 04 · GALERIJA</span>
            </div>
            <h2 className="section-title" style={{ color: "var(--cream)", marginBottom: 0 }}>
              <span data-sr>Our work.</span>
              <span data-lat>Naš rad.</span>
            </h2>
          </div>
          {socialLinks.instagram.enabled && socialLinks.instagram.url.trim() !== "" && (
            <a
              href={socialLinks.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
                fontSize: "12px",
                letterSpacing: ".1em",
                color: "rgba(212,165,58,.5)",
                textDecoration: "none",
                textTransform: "uppercase",
              }}
            >
              <span data-sr>VIEW ON INSTAGRAM →</span>
              <span data-lat>POGLEDAJ NA INSTAGRAM →</span>
            </a>
          )}
        </div>

        <div className="gallery-grid">
          {gallery.map((g, i) => (
            <div key={i} className={`gallery-item ${g.cls}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.src}
                alt={g.altLat}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── BLOG ────────────────────────────────────────── */}
      {blogPosts.length > 0 && (
        <section id="blog" className="section" style={{ position: "relative" }}>
          <div className="ghost-watermark" style={{ top: -30, fontSize: 150 }} data-sr>TIPS</div>
          <div className="ghost-watermark" style={{ top: -30, fontSize: 150 }} data-lat>SAVETI</div>
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
            <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>BLOG</span><span className="kicker-label" data-lat>BLOG</span></div>
            <h2 className="section-title" style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: 52, lineHeight: 1 }}>
              <span data-sr>Our blog</span><span data-lat>Naš blog</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginTop: 48 }}>
              {blogPosts.map((p) => (
                <a key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ position: "relative", height: 260, overflow: "hidden" }}>
                    {p.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  <h3 style={{ margin: "22px 0 10px", fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 19, lineHeight: 1.2, textTransform: "uppercase" }}>
                    <span data-sr>{p.title_sr}</span><span data-lat>{p.title_lat}</span>
                  </h3>
                  {p.published_at && (
                    <span style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--mustard)" }}>
                      {new Date(p.published_at).toLocaleDateString("sr-RS", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BAND ────────────────────────────────────── */}
      <section className="cta-band">
        <p className="cta-band-eyebrow">
          <span data-sr>NO RUSH · NO WAITING</span>
          <span data-lat>BEZ ŽURBE · BEZ ČEKANJA</span>
        </p>
        <h2 className="cta-band-title">
          <span data-sr>
            Book online.
            <br />
            Come in whenever.
          </span>
          <span data-lat>
            Zakaži online.
            <br />
            Dođi kad želiš.
          </span>
        </h2>
        <a href="/zakazivanje" className="btn-dark">
          <span data-sr>BOOK NOW →</span>
          <span data-lat>ZAKAŽI TERMIN →</span>
        </a>
        <p className="cta-band-note" data-sr>Book in under 30 seconds. No account needed.</p>
        <p className="cta-band-note" data-lat>Rezervacija za manje od 30 sekundi. Bez naloga.</p>
      </section>

      </main>

      <SiteFooter phone={salon?.phone ?? undefined} email={salon?.email ?? undefined} address={salon?.address ?? undefined} workingHours={salon?.working_hours ?? undefined} socialLinks={socialLinks} />
    </>
  );
}

// Used as the empty-DB fallback for /#usluge (matches Barbershop Vuk's
// service catalog). Once admin /admin/usluge has rows, this list is bypassed.
const DEFAULT_SERVICES_GRID = [
  { nameSr: "Fade", nameLat: "Fade", price: 1500 },
  { nameSr: "Long hair styling", nameLat: "Oblikovanje duge kose", price: 1500 },
  { nameSr: "Classic haircut", nameLat: "Klasično šišanje", price: 1200 },
  { nameSr: "Clipper cut", nameLat: "Mašinica klasično", price: 1000 },
  { nameSr: "Head shave", nameLat: "Brijanje glave", price: 800 },
  { nameSr: "Beard styling", nameLat: "Oblikovanje brade", price: 900 },
  { nameSr: "Beard trim", nameLat: "Skraćivanje/skidanje brade", price: 400 },
  { nameSr: "Haircut + beard", nameLat: "Šišanje + brada", price: 2000 },
  { nameSr: "Clipper cut + beard", nameLat: "Mašinica klasično + brada", price: 1700 },
];

// Line-SVG icons per service, keyed off the Latin name (ASCII, safe to match on).
// Matches the new design's skewed-tile icon treatment (no emoji).
// Same scissors icon for every service tile — one consistent mark rather
// than a different heuristic-matched glyph per service name.
function serviceIconSvg(_nameLat: string): JSX.Element {
  const stroke = { stroke: "#EFE9DD", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>;
}

// Used as the empty-DB fallback for /#galerija. Source files live in
// public/legacy/uploads/ and were the original 6 photos Triša provided.
const GALLERY = [
  { cls: "g1", src: "/legacy/uploads/IMG_0025.jpeg", alt: "Salon" },
  { cls: "g2", src: "/legacy/uploads/IMG_0026.jpeg", alt: "Fade" },
  { cls: "g3", src: "/legacy/uploads/IMG_0585.jpeg", alt: "Šišanje" },
  { cls: "g4", src: "/legacy/uploads/IMG_0641.jpeg", alt: "Fade" },
  { cls: "g5", src: "/legacy/uploads/IMG_0716.jpeg", alt: "Stil" },
  { cls: "g6", src: "/legacy/uploads/IMG_0823.jpeg", alt: "Rezultat" },
];
