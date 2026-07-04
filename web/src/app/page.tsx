import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteBanner } from "@/components/site-banner";
import { JsonLd } from "@/components/json-ld";
import { createClient } from "@/lib/supabase/server";
import { computeOpenStatus } from "@/lib/working-hours";
import { buildLocalBusinessJsonLd } from "@/lib/seo/local-business";
import { formatPhoneE164 } from "@/lib/phone";
import { parseSocialLinks, visibleLinks } from "@/lib/social-links";

export default async function HomePage() {
  const supabase = createClient();

  // Read salon + services + gallery + site_content in parallel
  const [salonRes, servicesRes, galleryRes, contentRes] = await Promise.all([
    supabase.from("salons").select("name, address, phone, email, working_hours, social_links").eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa").single(),
    supabase.from("services").select("name_sr, name_lat, price, duration_min, featured, description_sr, description_lat, meta_sr, meta_lat").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("gallery_images").select("id, url, alt_sr, alt_lat, sort_order, size").order("sort_order", { ascending: true }),
    supabase.from("site_content").select("key, value_sr, value_lat"),
  ]);

  const salon = salonRes.data;
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

  // 9 site-content slots — fallbacks restore the original page text so a
  // DB outage / unseeded fresh deploy still renders the salon's voice. DB
  // values (admin /admin/sajt) take precedence whenever present.
  const heroEyebrow  = getC("hero_eyebrow",  "STYLE · TRADITION · STORY", "STIL · TRADICIJA · PRIČA");
  const heroTitle    = getC("hero_title",    "We will keep you an|impeccable look", "Mesto gde se rez|pretvara u priču");
  const heroSubtitle = getC("hero_subtitle", "Barbershop Vuk — a men's barbershop in Batajnica. Haircuts, beard, good stories. No rush, no fuss. Just what you need.", "Barbershop Vuk — muška berbernica u Batajnici. Šišanje, brada, dobra priča. Bez žurbe, bez kompleksa. Samo ono što treba.");
  const aboutTitle   = getC("about_title",   "Professional barbershop|for men only.", "Tvoj izgled,|naša pravila.");
  const aboutStory   = getC("about_story",   "Forget waiting in line and flipping through old magazines. Opened in 2024, we combined honest craft in the barber chair with technology that respects your time. No philosophizing here: the focus is on a sharp fade, precise beard work, and healthy-looking hair.", "Zaboravi na čekanje u redovima i listanje starih novina. Osnovani 2024. godine, spojili smo zanatski pristup berberskoj stolici sa tehnologijom koja poštuje tvoje vreme. Kod nas nema filozofiranja: fokus je na brutalnom Fade-u, hirurški preciznoj bradi i zdravom izgledu kose.");
  const review1      = getC("review_1",      "Best haircut in Batajnica. Always on time, never rushed, and I leave happy. Price is fair, atmosphere is great.", "Najbolje šišanje u Batajnici. Uvek stignu na vreme, nikad ne žurim, i izlazim srećan. Cena ok, atmosfera super.");
  const review2      = getC("review_2",      "I've been coming since opening day. Never disappointed. They know exactly how I like it. My son comes here too.", "Dolazim od prvog dana otvaranja. Nikad me nisu razočarali. Znaju kako šišam. I sin mi ide ovde.");
  const review3      = getC("review_3",      "Nice, warm barbershop. No pretension, no \"stylist\" attitude. Just good craft and a good story.", "Lepa, topla berbernica. Bez naduvavanja, bez „stilista\". Samo dobar zanat i prava priča.");

  // Hero / about titles use a "|" line-break marker — first segment renders normally, second as <em>.
  const splitTitle = (s: string): [string, string] => {
    const i = s.indexOf("|");
    return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)];
  };
  const [heroTitleA_sr,  heroTitleB_sr]  = splitTitle(heroTitle.sr);
  const [heroTitleA_lat, heroTitleB_lat] = splitTitle(heroTitle.lat);
  const [aboutTitleA_sr,  aboutTitleB_sr]  = splitTitle(aboutTitle.sr);
  const [aboutTitleA_lat, aboutTitleB_lat] = splitTitle(aboutTitle.lat);
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
  // working_hours are stored in salon-local time (Belgrade). On Vercel the
  // process is UTC, so convert before computing today's open status — otherwise
  // a 21:00 Belgrade visit would read as 19:00/20:00 UTC and the badge could
  // claim "ОТВОРЕНО · ДО 20H" past closing.
  const belgradeNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
  const openStatus = computeOpenStatus(salon?.working_hours, belgradeNow);

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

  return (
    <>
      <JsonLd data={localBusinessJsonLd} />
      <SiteBanner />
      <SiteNav />

      <main id="main-content">

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="hero" id="hero">
        <div className={`hero-open-tag${openStatus.isOpen ? "" : " closed"}`}>
          <div className="hero-open-dot"></div>
          <span data-sr>{openStatus.textSr}</span>
          <span data-lat>{openStatus.textLat}</span>
        </div>
        <div className="hero-grid">
          <div className="hero-text">
            <h1 className="hero-title">
              <span data-sr>
                {heroTitleA_sr}
                {heroTitleB_sr && <><br /><em>{heroTitleB_sr}</em></>}
              </span>
              <span data-lat>
                {heroTitleA_lat}
                {heroTitleB_lat && <><br /><em>{heroTitleB_lat}</em></>}
              </span>
            </h1>

            <p className="hero-sub">
              <span data-sr>{heroSubtitle.sr}</span>
              <span data-lat>{heroSubtitle.lat}</span>
            </p>

            <div className="hero-contact">
              <div className="hero-contact-item">
                <span aria-hidden="true">📍</span> {salon?.address ?? "Majora Zorana Radosavljevića 138, Beograd 11273"}
              </div>
              <div className="hero-contact-item">
                <span aria-hidden="true">📞</span>{" "}
                <a href={`tel:${formatPhoneE164(salon?.phone ?? "060 1424576")}`}>{salon?.phone ?? "060 1424576"}</a>
              </div>
            </div>

            <div className="hero-cta-row">
              <a href="/zakazivanje" className="btn-primary" style={{ fontSize: "15px", padding: "14px 32px" }}>
                <span data-sr>BOOK NOW</span>
                <span data-lat>ZAKAŽI TERMIN</span> →
              </a>
              <a href="#usluge" className="btn-ghost">
                <span data-sr>SERVICES & PRICES</span>
                <span data-lat>CENE I USLUGE</span>
              </a>
            </div>
          </div>

          <div className="hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-trisha.webp" alt="Barbershop Vuk" />
          </div>
        </div>
      </section>

      {/* ── O NAMA ──────────────────────────────────────── */}
      <section className="section onama" id="onama">
        <div className="onama-grid">
          <div className="onama-text">
            <div className="section-label" data-reveal="left">
              <span data-sr>§ 02 · ABOUT</span>
              <span data-lat>§ 02 · O NAMA</span>
            </div>
            <h2 className="section-title" data-reveal="up-lg">
              <span data-sr>
                {aboutTitleA_sr}
                {aboutTitleB_sr && <><br />{aboutTitleB_sr}</>}
              </span>
              <span data-lat>
                {aboutTitleA_lat}
                {aboutTitleB_lat && <><br />{aboutTitleB_lat}</>}
              </span>
            </h2>
            <p data-reveal="up">
              <span data-sr>{aboutStory.sr}</span>
              <span data-lat>{aboutStory.lat}</span>
            </p>
            <p data-reveal="up">
              <span data-sr>
                We book exclusively through the app — reserve in 10 seconds, show up, get your treatment, and get on with your day. While you're here, pick up top-shelf products or serious tools to keep your style going at home.
              </span>
              <span data-lat>
                Radimo isključivo preko aplikacije — bukiraš za 10 sekundi, pojaviš se, dobiješ tretman i nastavljaš dalje. Dok si tu, pokupi najbolje preparate ili ozbiljan alat da održavaš stil i kod kuće.
              </span>
            </p>
            <p className="loyalty-line" data-reveal="up">
              <span data-sr>Every 6th haircut is on the house. Book now, don't wait.</span>
              <span data-lat>Šesto šišanje časti kuća. Zakaži, ne čekaj.</span>
            </p>
            <a href="#usluge" className="btn-primary" data-reveal="up" style={{ marginTop: 8 }}>
              <span data-sr>LEARN MORE</span>
              <span data-lat>SAZNAJ VIŠE</span>
            </a>
          </div>

          <div className="stats-grid" data-reveal-stagger="fast">
            <div className="stat-card" data-reveal="up">
              <div className="stat-val">2024</div>
              <div className="stat-label">
                <span data-sr>SINCE</span>
                <span data-lat>OSNOVANI</span>
              </div>
            </div>
            <div className="stat-card" data-reveal="up">
              <div className="stat-val">{services.length || 9}+</div>
              <div className="stat-label">
                <span data-sr>SERVICES</span>
                <span data-lat>USLUGA U PONUDI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USLUGE ──────────────────────────────────────── */}
      <section className="section usluge" id="usluge">
        <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
          <div className="section-label" data-reveal="left">
            <span data-sr>§ 03 · SERVICES</span>
            <span data-lat>§ 03 · USLUGE</span>
          </div>
          <h2 className="section-title" data-reveal="up-lg">
            <span data-sr>What we provide.</span>
            <span data-lat>Šta radimo.</span>
          </h2>
          <p className="usluge-note" data-sr data-reveal="fade">
            PAID BY CASH OR CARD · NO SURCHARGES · NO "SERVICE FEES"
          </p>
          <p className="usluge-note" data-lat data-reveal="fade">
            PLAĆA SE GOTOVINOM ILI KARTICOM · BEZ DOPLATA · BEZ "SERVISNIH NAKNADA"
          </p>

          <div className="services-grid" data-reveal-stagger>
            {(services.length > 0 ? services : DEFAULT_SERVICES_GRID).map((s, i) => {
              const nameSr = "name_sr" in s ? s.name_sr : s.nameSr;
              const nameLat = "name_lat" in s ? s.name_lat : s.nameLat;
              const descSr = "description_sr" in s ? s.description_sr : undefined;
              const descLat = "description_lat" in s ? s.description_lat : undefined;
              return (
                <div key={i} className="svc-tile" data-reveal="up">
                  <div className="svc-tile-icon" aria-hidden="true">{serviceIcon(nameLat)}</div>
                  <div className="svc-tile-name">
                    <span data-sr>{nameSr}</span>
                    <span data-lat>{nameLat}</span>
                  </div>
                  {(descSr || descLat) && (
                    <div className="svc-tile-desc">
                      <span data-sr>{descSr ?? ""}</span>
                      <span data-lat>{descLat ?? ""}</span>
                    </div>
                  )}
                  <div className="svc-tile-price">
                    <span data-sr>FROM </span>
                    <span data-lat>OD </span>
                    {s.price} RSD
                  </div>
                </div>
              );
            })}
          </div>

          <div className="services-footer" data-reveal="up">
            <a href="/zakazivanje" className="btn-primary">
              <span data-sr>BOOK NOW →</span>
              <span data-lat>ZAKAŽI TERMIN →</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── GALERIJA ────────────────────────────────────── */}
      <section className="galerija" id="galerija">
        <div className="galerija-header">
          <div>
            <div className="section-label" style={{ color: "var(--mustard)" }} data-reveal="left">
              <span data-sr>§ 04 · ГАЛЕРИЈА</span>
              <span data-lat>§ 04 · GALERIJA</span>
            </div>
            <h2 className="section-title" style={{ color: "var(--cream)", marginBottom: 0 }} data-reveal="up-lg">
              <span data-sr>Наш рад.</span>
              <span data-lat>Naš rad.</span>
            </h2>
          </div>
          {socialLinks.instagram.enabled && socialLinks.instagram.url.trim() !== "" && (
            <a
              href={socialLinks.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                letterSpacing: ".1em",
                color: "rgba(212,165,58,.5)",
                textDecoration: "none",
                textTransform: "uppercase",
              }}
            >
              <span data-sr>ПОГЛЕДАЈ НА INSTAGRAM →</span>
              <span data-lat>POGLEDAJ NA INSTAGRAM →</span>
            </a>
          )}
        </div>

        <div className="gallery-grid" data-reveal-stagger>
          {gallery.map((g, i) => (
            <div key={i} className={`gallery-item ${g.cls}`} data-reveal="scale">
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

      {/* ── UTISCI ──────────────────────────────────────── */}
      <section className="section utisci" id="utisci">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-label" data-reveal="left">
            <span data-sr>§ 05 · УТИСЦИ</span>
            <span data-lat>§ 05 · UTISCI</span>
          </div>
          <h2 className="section-title" data-reveal="up-lg">
            <span data-sr>Шта кажу мушterije.</span>
            <span data-lat>Šta kažu mušterije.</span>
          </h2>

          <div className="reviews-grid" data-reveal-stagger="slow">
            {REVIEWS.map((r, i) => {
              const dbText = [review1, review2, review3][i];
              // getC() always returns either DB value or hardcoded fallback,
              // so we always have text to render (no skip).
              return (
                <div key={i} className="review-card" data-reveal="up">
                  <div className="review-quote-mark">&quot;</div>
                  <div className="review-stars">★★★★★</div>
                  <p className="review-text" data-sr>{dbText.sr}</p>
                  <p className="review-text" data-lat>{dbText.lat}</p>
                  <div className="review-meta">
                    <div className="review-avatar" data-sr>{r.initialsSr}</div>
                    <div className="review-avatar" data-lat>{r.initialsLat}</div>
                    <div>
                      <div className="review-author" data-sr>{r.authorSr}</div>
                      <div className="review-author" data-lat>{r.authorLat}</div>
                      <div className="review-source" data-sr>{r.sourceSr}</div>
                      <div className="review-source" data-lat>{r.sourceLat}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LOKACIJA ────────────────────────────────────── */}
      <section className="section lokacija" id="lokacija">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-label" data-reveal="left">
            <span data-sr>§ 06 · ЛОКАЦИЈА</span>
            <span data-lat>§ 06 · LOKACIJA</span>
          </div>
          <h2 className="section-title" data-reveal="up-lg">
            <span data-sr>Где смо.</span>
            <span data-lat>Gde smo.</span>
          </h2>

          <div className="lokacija-grid" data-reveal-stagger="slow">
            <a
              data-reveal="scale"
              className="map-card"
              href={`https://maps.google.com/?q=${encodeURIComponent(salon?.address ?? "Majora Zorana Radosavljevića 226b, Batajnica")}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Otvori ${salon?.address ?? "Majora Zorana Radosavljevića 226b, Batajnica"} u Google Maps`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mapa-lokacija.webp"
                alt="Mapa lokacije Barbershop Vuk u Batajnici"
                className="map-card-img"
                width={1200}
                height={675}
                loading="lazy"
              />
              <div className="map-card-overlay" aria-hidden="true" />
              <div className="map-card-address">
                <span>📍</span>
                <span>{salon?.address ?? "Majora Zorana Radosavljevića 226b, Batajnica"}</span>
              </div>
              <span className="map-card-cta">
                <span data-sr>ОТВОРИ У GOOGLE MAPS</span>
                <span data-lat>OTVORI U GOOGLE MAPS</span>
                <span className="map-card-cta-arrow" aria-hidden="true">→</span>
              </span>
            </a>

            <div data-reveal="up">
              <HoursCard workingHours={salon?.working_hours} />

              <div className="contact-info">
                <div className="contact-row">
                  <span>📞</span>
                  <a
                    href={`tel:${formatPhoneE164(salon?.phone ?? "065 9003 742")}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {salon?.phone ?? "065 9003 742"}
                  </a>
                </div>
                <div className="contact-row">
                  <span>✉</span>
                  <span>{salon?.email ?? "sekaimiraitest1@gmail.com"}</span>
                </div>
                <div className="contact-row">
                  <span>📍</span>
                  <span>{salon?.address ?? "Majora Zorana Radosavljevića 226b, Batajnica"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ────────────────────────────────────── */}
      <section className="cta-band" data-reveal-stagger="slow">
        <p className="cta-band-eyebrow" data-reveal="fade">
          <span data-sr>БЕЗ ЖУРБЕ · БЕЗ ЧЕКАЊА</span>
          <span data-lat>BEZ ŽURBE · BEZ ČEKANJA</span>
        </p>
        <h2 className="cta-band-title" data-reveal="up-lg">
          <span data-sr>
            Закажи онлине.
            <br />
            Дођи кад желиш.
          </span>
          <span data-lat>
            Zakaži online.
            <br />
            Dođi kad želiš.
          </span>
        </h2>
        <a href="/zakazivanje" className="btn-dark" data-reveal="up">
          <span data-sr>ЗАКАЖИ ТЕРМИН →</span>
          <span data-lat>ZAKAŽI TERMIN →</span>
        </a>
        <p className="cta-band-note" data-sr data-reveal="fade">Резервација за мање од 30 секунди. Без налога.</p>
        <p className="cta-band-note" data-lat data-reveal="fade">Rezervacija za manje od 30 sekundi. Bez naloga.</p>
      </section>

      </main>

      <SiteFooter phone={salon?.phone ?? undefined} email={salon?.email ?? undefined} address={salon?.address ?? undefined} workingHours={salon?.working_hours ?? undefined} socialLinks={socialLinks} />
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Hours card — picks today and highlights the row
// ──────────────────────────────────────────────────────────
type WorkingHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string } | null>;

function HoursCard({ workingHours }: { workingHours?: WorkingHours | null }) {
  const days: { key: keyof WorkingHours; sr: string; lat: string }[] = [
    { key: "mon", sr: "Понедељак", lat: "Ponedeljak" },
    { key: "tue", sr: "Уторак", lat: "Utorak" },
    { key: "wed", sr: "Среда", lat: "Sreda" },
    { key: "thu", sr: "Четвртак", lat: "Četvrtak" },
    { key: "fri", sr: "Петак", lat: "Petak" },
    { key: "sat", sr: "Субота", lat: "Subota" },
    { key: "sun", sr: "Недеља", lat: "Nedelja" },
  ];

  const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0..Sun=6

  return (
    <div className="hours-card">
      <div className="hours-title" data-sr>РАДНО ВРЕМЕ</div>
      <div className="hours-title" data-lat>RADNO VREME</div>
      {days.map((d, i) => {
        const wh = workingHours?.[d.key];
        const isToday = i === todayIndex;
        return (
          <div key={d.key} className={`hours-row ${isToday ? "today" : ""}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="hours-day" data-sr>{d.sr}</span>
              <span className="hours-day" data-lat>{d.lat}</span>
              {isToday && (
                <>
                  <span className="today-badge" data-sr>ДАНАС</span>
                  <span className="today-badge" data-lat>DANAS</span>
                </>
              )}
            </div>
            {wh ? (
              <span className="hours-time">
                {wh.open} — {wh.close}
              </span>
            ) : (
              <>
                <span className="hours-closed" data-sr>ЗАТВОРЕНО</span>
                <span className="hours-closed" data-lat>ZATVORENO</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Reviewer metadata for the testimonials section. Only initials, author name,
// and source label live in code — the actual review text is editable via
// /admin/sajt → review_1 / review_2 / review_3 (site_content table).
// ──────────────────────────────────────────────────────────
const REVIEWS = [
  { initialsSr: "МК", initialsLat: "MK", authorSr: "Марко К.", authorLat: "Marko K.", sourceSr: "Google · 2 нед.", sourceLat: "Google · 2 ned." },
  { initialsSr: "НЈ", initialsLat: "NJ", authorSr: "Никола Ј.", authorLat: "Nikola J.", sourceSr: "Google · 1 мес.", sourceLat: "Google · 1 mes." },
  { initialsSr: "СП", initialsLat: "SP", authorSr: "Стефан П.", authorLat: "Stefan P.", sourceSr: "Google · 3 нед.", sourceLat: "Google · 3 ned." },
];

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

// Heuristic icon per service, keyed off the Latin name (ASCII, safe to match on).
function serviceIcon(nameLat: string): string {
  const n = nameLat.toLowerCase();
  if (n.includes("+ brada") || n.includes("+ beard")) return "💈";
  if (n.includes("brijanje") || n.includes("shave")) return "🪒";
  if (n.includes("brada") || n.includes("beard")) return "🧔";
  return "✂️";
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
