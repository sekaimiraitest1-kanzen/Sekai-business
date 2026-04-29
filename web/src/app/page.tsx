import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteBanner } from "@/components/site-banner";
import { createClient } from "@/lib/supabase/server";
import { computeOpenStatus } from "@/lib/working-hours";

export default async function HomePage() {
  const supabase = createClient();

  // Read salon + services + gallery in parallel
  const [salonRes, servicesRes, galleryRes] = await Promise.all([
    supabase.from("salons").select("name, address, phone, email, working_hours").eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa").single(),
    supabase.from("services").select("name_sr, name_lat, price, duration_min").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("gallery_images").select("id, url, alt_sr, alt_lat, sort_order, size").order("sort_order", { ascending: true }),
  ]);

  const salon = salonRes.data;
  const services = servicesRes.data ?? [];
  // Use DB gallery if seeded; otherwise fall back to the legacy hardcoded list so
  // the section never goes empty (BUG-6 fix). DB values come from /admin/galerija.
  // CSS classes g1..g6 define the asymmetric grid spans (g1 is 2×2 large, g2/g3/g6 span 2 cols, g4/g5 span 1).
  // Map DB rows in sort_order to those classes positionally — admin's drag-reorder controls layout order.
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
              Место где се рез
              <br />
              <em>претвара у причу</em>
            </span>
            <span data-lat>
              Mesto gde se rez
              <br />
              <em>pretvara u priču</em>
            </span>
          </h1>

          <p className="hero-sub">
            <span data-sr>
              Берберница Триша — традиционална мушка берберница у Батајници. Шишање, брада, добра прича. Без журбе, без комплекса. Само оно што треба.
            </span>
            <span data-lat>
              Berbernica Triša — tradicionalna muška berbernica u Batajnici. Šišanje, brada, dobra priča. Bez žurbe, bez kompleksa. Samo ono što treba.
            </span>
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
                Твој изглед,
                <br />
                наша правила.
              </span>
              <span data-lat>
                Tvoj izgled,
                <br />
                naša pravila.
              </span>
            </h2>
            <p>
              <span data-sr>
                Заборави на чекање у редовима и листање старих новина. Основани 2025. године, спојили смо петогодишњи „гринд" у берберској столици са технологијом која поштује твоје време. Код нас нема филозофирања: фокус је на бруталном Fade-у, хируршки прецизној бради и здравом изгледу косе.
              </span>
              <span data-lat>
                Zaboravi na čekanje u redovima i listanje starih novina. Osnovani 2025. godine, spojili smo petogodišnji „grind" u berberskoj stolici sa tehnologijom koja poštuje tvoje vreme. Kod nas nema filozofiranja: fokus je na brutalnom Fade-u, hirurški preciznoj bradi i zdravom izgledu kose.
              </span>
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
            {services.length > 0
              ? services.map((s, i) => {
                  // Premium tier — flagged by name; spans both columns at the end of the grid.
                  const isFeatured = /vip/i.test(s.name_lat);
                  return (
                    <div key={i} className={`service-item ${isFeatured ? "featured" : ""}`}>
                      <div className="service-item-left">
                        <div className="service-meta">
                          <span data-sr>{s.duration_min} МИН{isFeatured ? " · PREMIUM" : ""}</span>
                          <span data-lat>{s.duration_min} MIN{isFeatured ? " · PREMIUM" : ""}</span>
                        </div>
                        <div className="service-name">
                          <span data-sr>{s.name_sr}</span>
                          <span data-lat>{s.name_lat}</span>
                        </div>
                        {isFeatured && (
                          <div className="service-desc">
                            <span data-sr>
                              Шишање · сређивање браде · топао пешкир третман · восак за нос и уши · стилизовање браде.
                            </span>
                            <span data-lat>
                              Šišanje · sređivanje brade · topao peškir tretman · vosak za nos i uši · stilizovanje brade.
                            </span>
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
                })
              : DEFAULT_SERVICES.map((s, i) => (
                  <div key={i} className="service-item">
                    <div className="service-item-left">
                      <div className="service-meta">
                        <span data-sr>{s.metaSr}</span>
                        <span data-lat>{s.metaLat}</span>
                      </div>
                      <div className="service-name">
                        <span data-sr>{s.nameSr}</span>
                        <span data-lat>{s.nameLat}</span>
                      </div>
                    </div>
                    <div className="service-price">
                      {s.price}
                      <span className="service-currency" data-sr>РСД</span>
                      <span className="service-currency" data-lat>RSD</span>
                    </div>
                  </div>
                ))}
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
            {REVIEWS.map((r, i) => (
              <div key={i} className="review-card">
                <div className="review-quote-mark">&quot;</div>
                <div className="review-stars">★★★★★</div>
                <p className="review-text" data-sr>{r.textSr}</p>
                <p className="review-text" data-lat>{r.textLat}</p>
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
            ))}
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
                  <span data-sr>{salon?.address ?? "Мајора Зорана Радосављевића 226b, Батајница"}</span>
                  <span data-lat>Majora Zorana Radosavljevića 226b, Batajnica</span>
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(salon?.address ?? "Majora Zorana Radosavljevića 226b, Batajnica")}`}
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
                <div className="contact-row">
                  <span>📞</span>
                  <span>{salon?.phone ?? "065 9003 742"}</span>
                </div>
                <div className="contact-row">
                  <span>✉</span>
                  <span>{salon?.email ?? "berbernicatrisa@gmail.com"}</span>
                </div>
                <div className="contact-row">
                  <span>📍</span>
                  <span data-sr>{salon?.address ?? "Мајора Зорана Радосављевића 226b, Батајница"}</span>
                  <span data-lat>Majora Zorana Radosavljevića 226b, Batajnica</span>
                </div>
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

      <SiteFooter phone={salon?.phone} email={salon?.email} address={salon?.address} />
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
// Hardcoded fallbacks — used when DB tables are empty.
// Everything here will be admin-editable (services, gallery, reviews).
// ──────────────────────────────────────────────────────────

const DEFAULT_SERVICES = [
  { metaSr: "30 МИН", metaLat: "30 MIN", nameSr: "Обично шишање", nameLat: "Obično šišanje", price: 900 },
  { metaSr: "50 МИН · SIGNATURE", metaLat: "50 MIN · SIGNATURE", nameSr: "Fade шишање", nameLat: "Fade šišanje", price: 1200 },
  { metaSr: "60 МИН · МАКАЗЕ", metaLat: "60 MIN · MAKAZE", nameSr: "Шишање маказама", nameLat: "Šišanje makazama", price: 1400 },
  { metaSr: "70 МИН · КОМПЛЕТ", metaLat: "70 MIN · KOMPLET", nameSr: "Шишање + Брада", nameLat: "Šišanje + Brada", price: 1800 },
  { metaSr: "30 МИН", metaLat: "30 MIN", nameSr: "Бријање главе", nameLat: "Brijanje glave", price: 800 },
  { metaSr: "30 МИН · БРАДА", metaLat: "30 MIN · BRADA", nameSr: "Само брада", nameLat: "Samo brada", price: 600 },
  { metaSr: "90 МИН · PREMIUM", metaLat: "90 MIN · PREMIUM", nameSr: "VIP Третман", nameLat: "VIP Tretman", price: 2500 },
];

const GALLERY = [
  { cls: "g1", src: "/legacy/uploads/IMG_0025.jpeg", alt: "Salon" },
  { cls: "g2", src: "/legacy/uploads/IMG_0026.jpeg", alt: "Fade" },
  { cls: "g3", src: "/legacy/uploads/IMG_0585.jpeg", alt: "Šišanje" },
  { cls: "g4", src: "/legacy/uploads/IMG_0641.jpeg", alt: "Fade" },
  { cls: "g5", src: "/legacy/uploads/IMG_0716.jpeg", alt: "Stil" },
  { cls: "g6", src: "/legacy/uploads/IMG_0823.jpeg", alt: "Rezultat" },
];

const REVIEWS = [
  {
    initialsSr: "МК",
    initialsLat: "MK",
    authorSr: "Марко К.",
    authorLat: "Marko K.",
    sourceSr: "Google · 2 нед.",
    sourceLat: "Google · 2 ned.",
    textSr: "Најбоља берберница у Батајници, без конкуренције. Триша ради прецизно, чисто, без журбе. Увек излазим задовољан. Препоручујем свима.",
    textLat: "Najbolja berbernica u Batajnici, bez konkurencije. Triša radi precizno, čisto, bez žurbe. Uvek izlazim zadovoljan. Preporučujem svima.",
  },
  {
    initialsSr: "НЈ",
    initialsLat: "NJ",
    authorSr: "Никола Ј.",
    authorLat: "Nikola J.",
    sourceSr: "Google · 1 мес.",
    sourceLat: "Google · 1 mes.",
    textSr: "Поштен мајстор, топла атмосфера. Поручио сам и производе — стигли следећи дан. Страсно препоручујем берберницу Тришу свакоме ко цени квалитет.",
    textLat: "Pošten majstor, topla atmosfera. Poručio sam i proizvode — stigli sledeći dan. Strasno preporučujem berbernici Trišu svakome ko ceni kvalitet.",
  },
  {
    initialsSr: "СП",
    initialsLat: "SP",
    authorSr: "Стефан П.",
    authorLat: "Stefan P.",
    sourceSr: "Google · 3 нед.",
    sourceLat: "Google · 3 ned.",
    textSr: "Долазим годинама. Систем за заказивање је сада одличан — за пет минута имаш термин. И цена је фер. Ово је права берберница.",
    textLat: "Dolazim godinama. Sistem za zakazivanje je sada odličan — za pet minuta imaš termin. I cena je fer. Ovo je prava berbernica.",
  },
];
