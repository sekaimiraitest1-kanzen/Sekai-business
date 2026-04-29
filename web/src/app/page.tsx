import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteBanner } from "@/components/site-banner";
import { createClient } from "@/lib/supabase/server";
import { computeOpenStatus } from "@/lib/working-hours";

export default async function HomePage() {
  const supabase = createClient();

  // Read salon + services + gallery + site_content in parallel
  const [salonRes, servicesRes, galleryRes, contentRes] = await Promise.all([
    supabase.from("salons").select("name, address, phone, email, working_hours").eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa").single(),
    supabase.from("services").select("name_sr, name_lat, price, duration_min, featured, description_sr, description_lat, meta_sr, meta_lat").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("gallery_images").select("id, url, alt_sr, alt_lat, sort_order, size").order("sort_order", { ascending: true }),
    supabase.from("site_content").select("key, value_sr, value_lat"),
  ]);

  const salon = salonRes.data;
  const services = servicesRes.data ?? [];
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

  // 9 site-content slots — all fallbacks are EMPTY by design. With empty DB the
  // public site renders blank where content is wired, so the admin team can
  // verify via /admin/sajt that everything they seed reaches the public page
  // (and that no string is silently hardcoded). Once content is in the DB the
  // public site never shows blank.
  const heroEyebrow  = getC("hero_eyebrow",  "", "");
  const heroTitle    = getC("hero_title",    "", "");
  const heroSubtitle = getC("hero_subtitle", "", "");
  const aboutTitle   = getC("about_title",   "", "");
  const aboutStory   = getC("about_story",   "", "");
  const review1      = getC("review_1",      "", "");
  const review2      = getC("review_2",      "", "");
  const review3      = getC("review_3",      "", "");

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
  // Empty DB → empty section. No hardcoded fallback so the verification re-seed test is meaningful.
  const gallery = (galleryRes.data ?? []).slice(0, 6).map((row, i) => ({
    cls: `g${i + 1}`,
    src: row.url,
    altSr: row.alt_sr ?? "",
    altLat: row.alt_lat ?? "",
  }));
  // working_hours are stored in salon-local time (Belgrade). On Vercel the
  // process is UTC, so convert before computing today's open status — otherwise
  // a 21:00 Belgrade visit would read as 19:00/20:00 UTC and the badge could
  // claim "ОТВОРЕНО · ДО 20H" past closing.
  const belgradeNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
  const openStatus = computeOpenStatus(salon?.working_hours, belgradeNow);

  return (
    <>
      <SiteBanner />
      <SiteNav />

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="hero" id="hero">
        <div className={`hero-open-tag${openStatus.isOpen ? "" : " closed"}`}>
          <div className="hero-open-dot"></div>
          <span data-sr>{openStatus.textSr}</span>
          <span data-lat>{openStatus.textLat}</span>
        </div>
        <div className="hero-content">
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

          <div className="hero-cta-row">
            <a href="/zakazivanje" className="btn-primary" style={{ fontSize: "15px", padding: "14px 32px" }}>
              <span data-sr>ЗАКАЖИ ТЕРМИН</span>
              <span data-lat>ZAKAŽI TERMIN</span> →
            </a>
            <a href="#usluge" className="btn-ghost">
              <span data-sr>ЦЕНЕ И УСЛУГЕ</span>
              <span data-lat>CENE I USLUGE</span>
            </a>
          </div>

          <div className="hero-badges">
            <div className="hero-badge">
              <div className="hero-badge-val">900</div>
              <div className="hero-badge-label">
                <span data-sr>РСД ОД</span>
                <span data-lat>RSD OD</span>
              </div>
            </div>
            <div className="hero-badge">
              <div className="hero-badge-val">2025</div>
              <div className="hero-badge-label">
                <span data-sr>ОСНОВАНА</span>
                <span data-lat>OSNOVANA</span>
              </div>
            </div>
            <div className="hero-badge">
              <div className="hero-badge-val">4.9★</div>
              <div className="hero-badge-label">Google</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── O NAMA ──────────────────────────────────────── */}
      <section className="section onama" id="onama">
        <div className="onama-grid">
          <div className="onama-text">
            <div className="section-label">
              <span data-sr>§ 02 · О НАМА</span>
              <span data-lat>§ 02 · O NAMA</span>
            </div>
            <h2 className="section-title">
              <span data-sr>
                {aboutTitleA_sr}
                {aboutTitleB_sr && <><br />{aboutTitleB_sr}</>}
              </span>
              <span data-lat>
                {aboutTitleA_lat}
                {aboutTitleB_lat && <><br />{aboutTitleB_lat}</>}
              </span>
            </h2>
            <p>
              <span data-sr>{aboutStory.sr}</span>
              <span data-lat>{aboutStory.lat}</span>
            </p>
            <p>
              <span data-sr>
                Радимо искључиво преко апликације — букираш за 10 секунди, појавиш се, добијеш третман и настављаш даље. Док си ту, покупи најбоље препарате или озбиљан алат да одржаваш стил и код куће.
              </span>
              <span data-lat>
                Radimo isključivo preko aplikacije — bukiraš za 10 sekundi, pojaviš se, dobiješ tretman i nastavljaš dalje. Dok si tu, pokupi najbolje preparate ili ozbiljan alat da održavaš stil i kod kuće.
              </span>
            </p>
            <p className="loyalty-line">
              <span data-sr>Шесто шишање чисти кућа. Закажи, не чекај.</span>
              <span data-lat>Šesto šišanje časti kuća. Zakaži, ne čekaj.</span>
            </p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-val">5+</div>
              <div className="stat-label">
                <span data-sr>ГОДИНА ИСКУСТВА</span>
                <span data-lat>GODINA ISKUSTVA</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-val">60+</div>
              <div className="stat-label">
                <span data-sr>СТАЛНИХ МУШТ.</span>
                <span data-lat>STALNIH MUŠTERIJA.</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-val">4.9</div>
              <div className="stat-label">
                <span data-sr>★ GOOGLE ОЦЕНА</span>
                <span data-lat>★ GOOGLE OCENA</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{services.length || 11}</div>
              <div className="stat-label">
                <span data-sr>УСЛУГА У ПОНУДИ</span>
                <span data-lat>USLUGA U PONUDI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USLUGE ──────────────────────────────────────── */}
      <section className="section usluge" id="usluge">
        <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
          <div className="section-label">
            <span data-sr>§ 03 · УСЛУГЕ</span>
            <span data-lat>§ 03 · USLUGE</span>
          </div>
          <h2 className="section-title">
            <span data-sr>Шта радимо.</span>
            <span data-lat>Šta radimo.</span>
          </h2>
          <p className="usluge-note" data-sr>
            ПЛАЋА СЕ ГОТОВИНОМ ИЛИ КАРТИЦОМ · БЕЗ ДОПЛАТА · БЕЗ "СЕРВИСНИХ НАКНАДА"
          </p>
          <p className="usluge-note" data-lat>
            PLAĆA SE GOTOVINOM ILI KARTICOM · BEZ DOPLATA · BEZ "SERVISNIH NAKNADA"
          </p>

          <div className="services-list">
            {services.map((s, i) => {
              // Premium tier is now a per-row DB flag (services.featured) — admin /admin/usluge
              // can mark any service as featured and supply its own description / meta tag.
              const isFeatured = !!s.featured;
              const metaSr = s.meta_sr || `${s.duration_min} МИН`;
              const metaLat = s.meta_lat || `${s.duration_min} MIN`;
              return (
                <div key={i} className={`service-item ${isFeatured ? "featured" : ""}`}>
                  <div className="service-item-left">
                    <div className="service-meta">
                      <span data-sr>{metaSr}</span>
                      <span data-lat>{metaLat}</span>
                    </div>
                    <div className="service-name">
                      <span data-sr>{s.name_sr}</span>
                      <span data-lat>{s.name_lat}</span>
                    </div>
                    {isFeatured && (s.description_sr || s.description_lat) && (
                      <div className="service-desc">
                        <span data-sr>{s.description_sr ?? ""}</span>
                        <span data-lat>{s.description_lat ?? ""}</span>
                      </div>
                    )}
                  </div>
                  <div className="service-price">
                    {s.price}
                    <span className="service-currency" data-sr>РСД</span>
                    <span className="service-currency" data-lat>RSD</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="services-footer">
            <p className="services-disclaimer" data-sr>
              * Цене су оквирне · потврди са Тришом пре лаунча
            </p>
            <p className="services-disclaimer" data-lat>
              * Cene su okvirne · potvrdi sa Trišom pre launča
            </p>
            <a href="/zakazivanje" className="btn-primary">
              <span data-sr>ЗАКАЖИ ТЕРМИН →</span>
              <span data-lat>ZAKAŽI TERMIN →</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── GALERIJA ────────────────────────────────────── */}
      <section className="galerija" id="galerija">
        <div className="galerija-header">
          <div>
            <div className="section-label" style={{ color: "var(--mustard)" }}>
              <span data-sr>§ 04 · ГАЛЕРИЈА</span>
              <span data-lat>§ 04 · GALERIJA</span>
            </div>
            <h2 className="section-title" style={{ color: "var(--cream)", marginBottom: 0 }}>
              <span data-sr>Наш рад.</span>
              <span data-lat>Naš rad.</span>
            </h2>
          </div>
          <a
            href="https://instagram.com/"
            target="_blank"
            rel="noreferrer"
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
        </div>

        <div className="gallery-grid">
          {gallery.map((g, i) => (
            <div key={i} className={`gallery-item ${g.cls}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.src} alt={g.altLat} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── UTISCI ──────────────────────────────────────── */}
      <section className="section utisci" id="utisci">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-label">
            <span data-sr>§ 05 · УТИСЦИ</span>
            <span data-lat>§ 05 · UTISCI</span>
          </div>
          <h2 className="section-title">
            <span data-sr>Шта кажу мушterije.</span>
            <span data-lat>Šta kažu mušterije.</span>
          </h2>

          <div className="reviews-grid">
            {REVIEWS.map((r, i) => {
              const dbText = [review1, review2, review3][i] ?? { sr: "", lat: "" };
              // Skip cards whose text isn't seeded yet — admin /admin/sajt populates
              // review_1 / review_2 / review_3 in site_content.
              if (!dbText.sr && !dbText.lat) return null;
              return (
                <div key={i} className="review-card">
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
          <div className="section-label">
            <span data-sr>§ 06 · ЛОКАЦИЈА</span>
            <span data-lat>§ 06 · LOKACIJA</span>
          </div>
          <h2 className="section-title">
            <span data-sr>Где смо.</span>
            <span data-lat>Gde smo.</span>
          </h2>

          <div className="lokacija-grid">
            <div className="map-placeholder">
              <div className="map-placeholder-inner">
                <div className="map-pin"></div>
                <div className="map-label">
                  {salon?.address || ""}
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(salon?.address ?? "")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    letterSpacing: ".1em",
                    color: "var(--mustard)",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    marginTop: "8px",
                  }}
                >
                  <span data-sr>ОТВОРИ У GOOGLE MAPS →</span>
                  <span data-lat>OTVORI U GOOGLE MAPS →</span>
                </a>
              </div>
            </div>

            <div>
              <HoursCard workingHours={salon?.working_hours} />

              <div className="contact-info">
                {salon?.phone && (
                  <div className="contact-row">
                    <span>📞</span>
                    <span>{salon.phone}</span>
                  </div>
                )}
                {salon?.email && (
                  <div className="contact-row">
                    <span>✉</span>
                    <span>{salon.email}</span>
                  </div>
                )}
                {salon?.address && (
                  <div className="contact-row">
                    <span>📍</span>
                    <span>{salon.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ────────────────────────────────────── */}
      <section className="cta-band">
        <p className="cta-band-eyebrow">
          <span data-sr>БЕЗ ЖУРБЕ · БЕЗ ЧЕКАЊА</span>
          <span data-lat>BEZ ŽURBE · BEZ ČEKANJA</span>
        </p>
        <h2 className="cta-band-title">
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
        <a href="/zakazivanje" className="btn-dark">
          <span data-sr>ЗАКАЖИ ТЕРМИН →</span>
          <span data-lat>ZAKAŽI TERMIN →</span>
        </a>
        <p className="cta-band-note" data-sr>Резервација за мање од 30 секунди. Без налога.</p>
        <p className="cta-band-note" data-lat>Rezervacija za manje od 30 sekundi. Bez naloga.</p>
      </section>

      <SiteFooter phone={salon?.phone ?? undefined} email={salon?.email ?? undefined} address={salon?.address ?? undefined} workingHours={salon?.working_hours ?? undefined} />
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
// Cards render only for slots that have text in DB.
// ──────────────────────────────────────────────────────────
const REVIEWS = [
  { initialsSr: "МК", initialsLat: "MK", authorSr: "Марко К.", authorLat: "Marko K.", sourceSr: "Google · 2 нед.", sourceLat: "Google · 2 ned." },
  { initialsSr: "НЈ", initialsLat: "NJ", authorSr: "Никола Ј.", authorLat: "Nikola J.", sourceSr: "Google · 1 мес.", sourceLat: "Google · 1 mes." },
  { initialsSr: "СП", initialsLat: "SP", authorSr: "Стефан П.", authorLat: "Stefan P.", sourceSr: "Google · 3 нед.", sourceLat: "Google · 3 ned." },
];
