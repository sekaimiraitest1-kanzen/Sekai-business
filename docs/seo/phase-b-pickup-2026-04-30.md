---
name: SEO Phase B — pickup za novu sesiju
description: Ground-truth checkpoint za nastavak Phase B u zasebnom chatu. Sve što sledeća sesija mora da zna. Self-contained.
type: pickup
date: 2026-04-30
prerequisite-reads:
  - docs/seo/audit-2026-04-29-phase-a-1-technical.md
  - docs/seo/audit-2026-04-29-phase-a-2-platform.md
  - docs/seo/audit-2026-04-29-phase-a-3-citability.md
  - docs/seo/audit-2026-04-29-phase-a-4-llmstxt.md
  - docs/seo-geo-skills-research.md (workflow §5)
  - docs/seo/llm-crawler-handling-reference.md
---

# Trisha — SEO Phase B Pickup

**Status na 2026-04-30**: Phase A kompletan, Phase B **70% implementiran u working tree-u, NIJE COMMITOVAN**. Phase C nije pokrenut. Cilj ove sesije: **dovršiti Phase B + commit-ovati u logičnim grupama + opciono pokrenuti Phase C**.

---

## 1. Repo state

```
cwd:    /home/kaizenlinux/Projects/Luka_Projects/LukaPr_Trisha/Berbernica
branch: main (BerbernicaTrisa/Berbernica)
HEAD:   454dd7b  ("docs: admin Phase 1-4 confidence + audit + SEO research reports")
dev:    cd web && npm run dev → http://localhost:3050
```

**Working tree (uncommitted)** — svi ovi su Phase A + Phase B WIP. **Ne brisati ništa od ovoga**.

```
M  web/src/app/layout.tsx              # Phase B.2 root metadata (canonical, OG, Twitter, robots)
M  web/src/app/page.tsx                # Phase B.5 LocalBusiness JSON-LD inject + tel: link
M  web/src/app/shop/page.tsx           # Phase B.2 metadata export
M  web/src/app/zakazivanje/page.tsx    # Phase B.2 metadata export
M  web/src/components/site-footer.tsx  # tel: link wrapper

??  docs/seo/audit-2026-04-29-phase-a-1-technical.md
??  docs/seo/audit-2026-04-29-phase-a-2-platform.md
??  docs/seo/audit-2026-04-29-phase-a-3-citability.md
??  docs/seo/audit-2026-04-29-phase-a-4-llmstxt.md
??  docs/seo/llms.txt.draft
??  web/src/app/llms.txt/route.ts      # Phase B.1 llms.txt route (force-static)
??  web/src/app/robots.ts              # Phase B.1 robots (CCBot+Google-Extended blocked, sitemap declared)
??  web/src/app/sitemap.ts             # Phase B.1 sitemap (home + zakazivanje + shop + active products)
??  web/src/components/json-ld.tsx     # Phase B.5 helper komponenta
??  web/src/lib/phone.ts               # E.164 normalizer za tel: hrefs
??  web/src/lib/seo/local-business.ts  # Phase B.5 LocalBusiness builder (sa TODO: sameAs, aggregateRating)
??  .serena/                           # serena MCP cache, ignorabilno
```

---

## 2. Šta je VEĆ urađeno (NE PONAVLJATI)

| Phase | Item | Gde |
|---|---|---|
| **B.1** | robots.ts — default-allow, blokira CCBot + Google-Extended, deklariše sitemap | `web/src/app/robots.ts` |
| **B.1** | sitemap.ts — `/`, `/zakazivanje`, `/shop` + sve aktivne produkte iz Supabase | `web/src/app/sitemap.ts` |
| **B.1** | llms.txt — force-static route, kompletan sadržaj iz `llms.txt.draft` | `web/src/app/llms.txt/route.ts` |
| **B.2** | Root layout metadata — title template, description, metadataBase, manifest, icons, formatDetection, **canonical, openGraph, twitter, robots** | `web/src/app/layout.tsx:48-110` |
| **B.2** | `/shop` per-route metadata — title, description, canonical, openGraph | `web/src/app/shop/page.tsx:7-17` |
| **B.2** | `/zakazivanje` per-route metadata — title, description, canonical, openGraph | `web/src/app/zakazivanje/page.tsx:7-17` |
| **B.2** | PDP `/shop/[slug]` već je pre Phase B imao `generateMetadata` za title+description | `web/src/app/shop/[slug]/page.tsx` (postojeće) |
| **B.5** | `JsonLd` helper komponenta | `web/src/components/json-ld.tsx` |
| **B.5** | `buildLocalBusinessJsonLd()` — `LocalBusiness + HairSalon` schema sa NAP, geo, openingHoursSpecification (iz Supabase ili fallback), priceRange, image, areaServed, offerCatalog | `web/src/lib/seo/local-business.ts` |
| **B.5** | LocalBusiness JSON-LD injektovan u homepage | `web/src/app/page.tsx:77-91` |
| **B.5** | Phone `tel:` linkovi (homepage NAP + footer) preko `formatPhoneE164()` | `web/src/app/page.tsx`, `web/src/components/site-footer.tsx`, `web/src/lib/phone.ts` |

---

## 3. Šta je OSTALO za Phase B

Reference: brojevi koraka odgovaraju mapiranju iz audita Phase A.1 (priority list) + A.2 (cross-platform) + A.3 (citability handoff). Audit fajlovi su u `docs/seo/`.

### B.2b — sameAs + entitet linkovi *(BLOCKED na Stefan inputu)*

`local-business.ts:112-113` ima TODO komentar. Treba:

- [ ] Dobiti od Stefana: real Instagram URL (placeholder je `https://instagram.com/`), GBP public URL, FB URL ako postoji
- [ ] Dodati `sameAs: [...]` array u `buildLocalBusinessJsonLd()` return
- [ ] Popraviti placeholder Instagram link u homepage HTML-u (`web/src/app/page.tsx` — grep za `instagram.com`)
- [ ] **AggregateRating ostaviti TODO** — ne hardcode-ovati 4.9 dok ne postoji verifikabilan izvor (GBP API ili plaćena ekstrakcija). Audit Phase A.2 §ChatGPT eksplicitno upozorava.

### B.5 — JSON-LD koje fali

| ID | Schema | Lokacija | Effort |
|---|---|---|---|
| B5-1 | `Product` + `Offer` po PDP-u (name, image, brand, sku, price RSD, availability, description) | `web/src/app/shop/[slug]/page.tsx` — dodaj builder u `lib/seo/product.ts` + inject preko `JsonLd` | 1h |
| B5-2 | `ItemList` na `/shop` — 12 proizvoda sa pozicijama | `web/src/app/shop/page.tsx` — dodaj builder u `lib/seo/item-list.ts` | 30 min |
| B5-3 | `BreadcrumbList` na svim ne-home rutama | `lib/seo/breadcrumbs.ts` + inject u page.tsx fajlove | 45 min |
| B5-4 | `Service` schema za 11 usluga na `/zakazivanje` (delom već u LocalBusiness `offerCatalog`, ali zaseban Service blok poboljšava extraction) | `web/src/app/zakazivanje/page.tsx` | 30 min |
| B5-5 | `FAQPage` JSON-LD na home — **prerequisite**: B8-FAQ (FAQ sekcija prvo treba da postoji u HTML-u) | posle B8-FAQ | 30 min |
| B5-6 | `AggregateRating` — DEFER dok ne dobijemo verifikovan izvor | — | — |
| B5-7 | `Review` JSON-LD po testimonialu — **prerequisite**: B8-rev (testimonials prvo wrap-ovati u `<blockquote>+<cite>`) | posle B8-rev | 1h |

### B.3 — OG / Twitter slike per-rute

| ID | Task | Effort |
|---|---|---|
| B3-1 | Generiši 3 ciljane OG slike (1200×630): home (hero), `/zakazivanje` (calendar+brand), `/shop` (product grid). Trenutno svuda `logo-source.png`. | 1.5h (može art helper / Canva) |
| B3-2 | Per-PDP OG slika = product image (već u DB-u, treba `images: [{ url: product.image_url, ... }]` u PDP `generateMetadata`) | 30 min |

### B.6 — HTML / A11y / Performance dugovi

| ID | Task | Lokacija | Effort |
|---|---|---|---|
| B6-1 | Dodaj `<h1>` na `/zakazivanje` (trenutno page počinje sa H2 "Изабери услугу") | `web/src/app/zakazivanje/booking-flow.tsx` ili wrapper | 5 min |
| B6-2 | Alt text na PDP product image | `web/src/app/shop/[slug]/product-detail.tsx` | 5 min |
| B6-3 | `width` + `height` na sve `<img>` (10+ slika) — CLS contributor | grep za `<img` u `web/src/` | 1h |
| B6-4 | Trim hero preload sa 6 slika na 1 LCP sliku + `fetchpriority="high"`; ostatak lazy | `web/src/app/page.tsx` ili layout — naći `<link rel="preload" as="image">` | 30 min |

### B.8 — Content rewrites *(citability blokovi <60)*

Cilj: podići average citability sa 16.7 → 60+, ni jedan blok ispod 50. Reference: `audit-2026-04-29-phase-a-3-citability.md` §"Phase B handoff".

| ID | Page | Blok | Cur | Target | Direction |
|---|---|---|---|---|---|
| B8-hero | `/` | "Mesto gde se rez pretvara u priču" | 21 | 65+ | Ekspanzija na 134-167 reči "About Berbernica Triša": adresa, sati, godina osnivanja (2025), price floor (RSD), positioning vs typical Belgrade barbershop. Front-load fakte, opening pattern "Berbernica Triša je mušаka berbernica u Batajnici, osnovana 2025, ..." |
| B8-svc | `/` | "Šta radimo" | 16 | 60+ | Replace payment-disclaimer copy sa: (a) services description paragraf, (b) real `<table>` Usluga · Trajanje · Cena. Disclaimer pomeri u footer microcopy. |
| B8-rev | `/` | "Šta kažu mušterije" | 27 | 60+ | Per-quote `<blockquote>+<cite>`, integracija sa B5-7 Review schema |
| B8-shop | `/shop` | "Stil i kod kuće" intro | 24 | 60+ | 120-160 reči: brendovi (Reuzel, Layrite, Proraso, American Crew), price range, pickup hours, "in-store-only — smell-and-feel" pitch, opciono `<table>` top-5 kategorija × range |
| B8-book | `/zakazivanje` | (no block) | 0 | 50+ | Add 80-150-reči booking-flow intro paragraf iznad calendar widgeta: "Booking at Berbernica Triša: select service (XX-XX RSD), pick 30-min slot, confirm by SMS. Same-day cancellation up to 2 hours before. No deposit required." |
| B8-FAQ | `/` | NEW FAQ sekcija | — | — | 4-6 Q&A: "Gde se nalazi Berbernica Triša?" / "Koliko košta šišanje u Triši?" / "Da li je potrebno zakazivanje?" / "Koje je radno vreme?" / "Da li radite samo muška šišanja ili i bradu?" — answer 40-60 reči pod svakim. **Prerequisite za B5-5**. |
| B8-table | `/zakazivanje` ili `/` | services kartice → real `<table>` | — | — | AIO ekstraktuje tabele; kartice ne. Dodaj `<table>` (može i pored kartica radi vizuelnog presentation-a, ali tabela mora da bude u DOM-u). |

**Napomena o sr-Cyrl + sr-Latn pri pisanju copy-ja**: trenutni kod renderuje oba pisma side-by-side (kroz `data-sr` / `data-lat` atribute + CSS toggle). B8 rewrite-ovi MORAJU da slede taj pattern — ne pisati samo jedan script. Vidi audit A.1 §9.1 za detalje.

### B.9 — Security headers

| ID | Task | Lokacija | Effort |
|---|---|---|---|
| B9-1 | `next.config.mjs` `async headers()` set: `Content-Security-Policy` (audit prvo, ne breaking — start sa `report-only`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` | `web/next.config.mjs` | 1.5h |
| B9-2 | HSTS — Vercel setuje automatski na prod HTTPS, samo verifikuj posle deploy-a | — | 5 min |

### B.7 — i18n strategija *(HIGH severity, big decision — defer odluku Stefanu)*

Audit A.1 §9.1 + A.2 §4 preporučuju **route-level locale** (`/sr-Cyrl/...` + `/sr-Latn/...` + hreflang link tags), ali to je 6-10h refaktor. Tri opcije:

- **(A) Pre-release refaktor** — najčistiji SEO output, ali 6-10h posla, rizik za stabilnost
- **(B) Post-release V1.1** — pustiti V1 sa dual-script u istom HTML-u, refaktor mesec dana posle launch-a
- **(C) Collapse** na sr-Latn jedan kanonski script + client-side transliteration toggle za UX (~2h)

**Preporuka iz prošlog plana**: (B) za V1, (A) za V1.1. Stefan da donese odluku pre nego što sesija krene sa B.7 implementacijom — **ne počinjati B.7 u ovoj sesiji**.

---

## 4. Phase C — verify *(opciono, posle Phase B + nakon Vercel deploy-a)*

Phase C zahteva **prod URL** (PageSpeed Insights ne radi na localhost). Ako Vercel deploy nije gotov, odloži Phase C za sesiju posle deploy-a.

| ID | Task | Tool | Target |
|---|---|---|---|
| C1 | Re-run technical-seo-checker | aaron `technical-seo-checker` skill na prod URL | 47 → 80+ |
| C2 | Re-run geo-platform-optimizer | aaron `geo-platform-optimizer` skill | 33 → 55+ avg |
| C3 | Re-run citability scorer | `python ~/.claude/skills/geo-seo/scripts/citability_scorer.py <prod>/`, isto za /usluge i /o-nama (ako postoje) | 16.7 → 60+ avg, 0 blokova <50 |
| C4 | Re-run llms.txt validator | `python ~/.claude/skills/geo-seo/scripts/llmstxt_generator.py` (validate mode) | 200 OK, text/plain |
| C5 | PageSpeed Insights | https://pagespeed.web.dev/ | LCP <2.5s, INP <200ms, CLS <0.1 |
| C6 | Generiši comparison report | Write `docs/seo/audit-2026-MM-DD-phase-c-comparison.md` sa pre/posle skorovima i diff-om | — |

---

## 5. Stefanovi otvoreni inputi (dobiti pre nego što završimo Phase B)

1. **Production domain** — `berbernica.rs` / `trisha.rs` / `berbernicatrisa.com`? (potrebno za sve OG URL-ove, llms.txt absolute URL, sitemap base, env)
2. **Instagram handle** — real URL?
3. **GBP public URL** — Google Business Profile mora da je claimed; ako nije, to je #1 lokalna SEO akcija (off-site, nije za ovu sesiju, ali GBP URL nam treba za sameAs)
4. **FB stranica** — postoji? URL?
5. **B.7 i18n odluka** — A/B/C? (može se odložiti, ali bolje da znamo)
6. **AggregateRating izvor** — možemo li da skinemo trenutni `reviewCount` sa GBP-a (rucno) ili odlažemo u V1.1?

---

## 6. Commit strategija

Cilj: **Phase B se commit-uje u 4-6 logičnih grupa**, svaka samostalno reviewable. Ne squash-ovati.

Predložena podela:

```
1. docs(seo): Phase A audits (4 reports + llms.txt draft)
   docs/seo/audit-2026-04-29-phase-a-{1,2,3,4}-*.md
   docs/seo/llms.txt.draft

2. feat(seo): Phase B.1 — robots.ts + sitemap.ts + llms.txt route
   web/src/app/robots.ts
   web/src/app/sitemap.ts
   web/src/app/llms.txt/route.ts

3. feat(seo): Phase B.2 — per-route metadata (canonical, OG, Twitter, robots)
   web/src/app/layout.tsx
   web/src/app/page.tsx (samo metadata-related delovi — ako je moguće odvojiti)
   web/src/app/shop/page.tsx
   web/src/app/zakazivanje/page.tsx

4. feat(seo): Phase B.5 — LocalBusiness JSON-LD + tel: links + phone E.164 helper
   web/src/components/json-ld.tsx
   web/src/lib/phone.ts
   web/src/lib/seo/local-business.ts
   web/src/app/page.tsx (JSON-LD inject + tel:)
   web/src/components/site-footer.tsx (tel:)

5. feat(seo): Phase B.5 — Product/ItemList/Breadcrumb JSON-LD
   web/src/lib/seo/{product,item-list,breadcrumbs}.ts
   web/src/app/shop/page.tsx
   web/src/app/shop/[slug]/page.tsx

6. feat(seo): Phase B.6 — H1, alt, image dims, hero preload trim

7. feat(seo): Phase B.9 — security headers
   web/next.config.mjs

8. feat(seo): Phase B.8 — content rewrites + FAQ + price table + Review/FAQPage JSON-LD
   (multi-file — može da se podeli na 2-3 commita po sekciji)

9. feat(seo): Phase B.3 — per-route OG images
```

`.serena/` ne commit-ovati — dodati u `.gitignore` ako već nije.

---

## 7. Sanity gates

Pre svakog commit-a:

```bash
cd web
npx tsc --noEmit       # 0 errors
npm run build          # PASS — ali kill dev prvo!
```

Posle Phase B kompletiranja, pre Phase C:

- [ ] `curl http://localhost:3050/robots.txt` → 200 + očekivani sadržaj
- [ ] `curl http://localhost:3050/sitemap.xml` → 200 + svi URL-ovi
- [ ] `curl http://localhost:3050/llms.txt` → 200 + `Content-Type: text/plain`
- [ ] View source na `/`, `/shop`, `/zakazivanje`, `/shop/<slug>` → svaki ima unique `<title>`, `<meta description>`, `<link rel="canonical">`, OG, Twitter, JSON-LD
- [ ] Lighthouse SEO score na `/` → 95+

---

## 8. Šta NE raditi u ovoj sesiji

- ❌ Ne diraj admin panel (Phase 1-4 su SHIPPED, sve confidence 91/100)
- ❌ Ne kreni B.7 i18n refaktor pre Stefan-ove odluke (A/B/C)
- ❌ Ne deploy-uj na Vercel (Stefan to radi nakon production-domain registracije)
- ❌ Ne hardcoduj `aggregateRating` (4.9★) — DEFER dok nemamo verifikabilan izvor
- ❌ Ne brisati `.serena/` direktno — samo u `.gitignore`
- ❌ Ne menjati `web/.env.local` (production env-ovi idu kroz Vercel dashboard)

---

## 9. Hand-off natrag u glavnu sesiju

Posle Phase B + (opciono) Phase C:

1. Push commit-ovani Phase B+C
2. Update `MEMORY.md` pickup pointer (replace pickup doc reference sa novim)
3. Generiši `docs/seo/phase-b-completion-2026-MM-DD.md` sa:
   - Šta je commit-ovano (lista commit hash-eva)
   - Šta je deferred (B.7 if not done, AggregateRating, B.3 OG ako nije bilo art helpera)
   - Phase C skorovi (ako su mereni)
   - Sledeći release blokeri (treba Stefan: domain, GBP claim, …)
4. Vrati Stefanu listu za sledeću dev sesiju (ne SEO)

