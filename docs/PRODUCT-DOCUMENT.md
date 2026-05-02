# Berbernica Triša — Product Document

**Verzija:** 1.0  
**Datum:** 2026-05-02  
**Klijent:** Berbernica Triša (Batajnica) — PIB 115240647, MB 68208955  
**Vlasnik / glavni admin:** Triša  
**Producent:** Triardor / Steppenvvolf  
**Repozitorijum:** `github.com/BerbernicaTrisa/Berbernica` (private)  
**Produkcija:** `https://berbernica-ruby.vercel.app` (do plug-in-a custom domena)

---

## 1. Šta je projekat

Web aplikacija za bermerski salon "Berbernica Triša" sa tri ključne funkcije:

1. **Javni sajt** — prezentacija salona, online zakazivanje termina, web shop sa proizvodima za negu (gel, vosak, šampon).
2. **Admin panel** — Triša (i njeni budući zaposleni) upravljaju terminima, proizvodima, mušterijama, statistikom, sadržajem sajta, sve preko PIN logina.
3. **Multi-staff** — kad Triša zaposli barbera, dobija svoj PIN i ograničen pregled (samo svoje + zajednički termini, lična zarada, sopstveni krug mušterija).

Klijent + zaposleni rade na mobilnom ili desktop browseru. Aplikacija je instalabilna kao PWA (radi i offline za pregled, online za upis).

---

## 2. Tehnologije

### Frontend + backend (jedan repo, jedan deploy)
| Stavka | Verzija | Uloga |
|---|---|---|
| **Next.js** | 14.2.35 (App Router) | React framework, server + client komponente, server actions |
| **React** | 18 | UI biblioteka |
| **TypeScript** | 5 | Statička tipizacija — sav kod osim CSS |
| **Tailwind CSS** | 3.4.1 | Utility-first CSS (samo lokalno za neke komponente) |
| **Hand-rolled CSS** | — | Glavni stilski sistem u `src/styles/*.css` (ne Tailwind) |

### Backend storage
| Stavka | Plan | Uloga |
|---|---|---|
| **Supabase Postgres** | Free tier | Glavna baza (svi tableovi, RLS politike) |
| **Supabase Storage** | Free tier | Slike proizvoda + galerije, originali bez transformacije |
| **Supabase Auth** | — | Trenutno nije korišćen — admin koristi PIN + JWT cookie |

### Auth
- **PIN-based login** za admin/staff. PIN se hash-uje sa **bcryptjs** (10 rounds).
- **Session cookie**: HTTP-only JWT potpisan sa SUPABASE_SERVICE_ROLE_KEY, TTL 24h. Biblioteka: **jose**.
- **Rate limit**: 5 pogrešnih PIN pokušaja = lockout 10 min na nivou salona (`salons.pin_locked_until`).

### Email
- **Resend** (free tier 3000 mailova/mesec) — transakcioni:
  - Potvrda rezervacije (booking → kupac)
  - Notifikacija o porudžbini (shop → Triša)
  - Potvrda porudžbine (shop → kupac)
  - "Spremno za pickup" (shop → kupac kad Triša obeleži ready)

### Validacija
- **Zod** — runtime schema validation za svaki server action (input forme).

### Deploy
- **Vercel** (Hobby tier) — hosting, build, atomski deploy preko Git push. CDN automatski.
- **Image Optimization isključen** (`next.config.mjs: images.unoptimized: true`) — slike se serviraju direktno iz Supabase Storage da se ne troši Vercel kvota.

### Analytics (opciono)
- **Plausible** — env-gated, GDPR-friendly, no cookies. Aktivira se samo kad se postavi `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.

### Monitoring
- **Sopstveni `error_log` table** — error boundary šalje grešku na server, čuva 30 dana (manuelno čišćenje).

---

## 3. Arhitektura

### Visok nivo
```
Klijent (browser)
   ↓ HTTPS
Vercel Edge / CDN (statički + serverless funkcije)
   ↓ Server Components + Server Actions (Next.js App Router)
   ├─ Supabase Postgres (data)  ← sve queries idu kroz Service Role key
   ├─ Supabase Storage (slike)  ← public bucket za sadržaj
   └─ Resend API (email)
```

### Glavne rute
| Ruta | Tip | Auth |
|---|---|---|
| `/` | Public | — |
| `/shop`, `/shop/[slug]` | Public | — |
| `/zakazivanje` | Public | — |
| `/privatnost`, `/uslovi-koriscenja` | Public | — |
| `/llms.txt`, `/robots.txt`, `/sitemap.xml` | Public (SEO) | — |
| `/api/ical` | Public sa tokenom | Token-gated |
| `/api/error-log` | Public POST | Anon insert |
| `/admin/login` | PIN gate | — |
| `/admin/termini` | Owner + Staff | PIN |
| `/admin/musterije` | Owner + Staff (scoped) | PIN |
| `/admin/statistike` | Owner + Staff (scoped) | PIN |
| `/admin/usluge`, `/shop`, `/galerija`, `/sajt`, `/blokirano`, `/podesavanja` | **Owner only** | PIN + role check |

### Folder layout (web/)
```
src/
├─ app/                          # Next.js App Router
│  ├─ page.tsx                   # Home
│  ├─ shop/                      # Shop public
│  ├─ zakazivanje/               # Booking public
│  ├─ admin/
│  │  ├─ login/                  # PIN pad
│  │  └─ (app)/                  # Auth-gated admin routes
│  │     ├─ _shell/              # Shared sidebar+top bar
│  │     ├─ termini/             # Bookings
│  │     ├─ musterije/           # Customers
│  │     ├─ shop/                # Products / categories / orders
│  │     ├─ galerija/, sajt/, blokirano/, statistike/, podesavanja/
│  └─ api/                       # Webhook routes
├─ components/                   # SiteNav, SiteFooter, JsonLd, etc.
├─ lib/
│  ├─ auth/                      # admin-session, with-admin, admin-role
│  ├─ booking/                   # Slot conflict math (overlap-aware)
│  ├─ email/                     # Resend client + templates
│  ├─ supabase/                  # Admin/anon clients
│  ├─ seo/                       # JSON-LD builders
│  └─ storage/                   # Image compression, upload, URLs
└─ styles/                       # Global + page-specific CSS
public/
├─ logo.svg, logo-120.png, logo-source.png
├─ icons/                        # PWA icons (192, 512, maskable)
├─ apple-touch-icon.png, manifest.json, sw.js
└─ legacy/                       # Original HTML mockups (visual reference)
supabase/
└─ migrations/                   # 001-009, idempotentne SQL fajlove
docs/                            # Ova i ostali handover dokumenti
```

---

## 4. Database schema (ključni tabeli)

| Table | Svrha |
|---|---|
| `salons` | Single-tenant scaffold (id, name, slug, working_hours JSONB, social_links JSONB, pin_locked_until). Trenutno samo jedan red — Triša. |
| `admin_users` | Triša + zaposleni. role: `admin`/`superadmin`/`staff`. is_active + deleted_at za lifecycle. PIN hash, telefon, ime, prezime. |
| `services` | Usluge sa cenom + duration_min (Šišanje 30min, Brada 30min, VIP 90min, itd.). |
| `bookings` | Rezervacije. salon_id, customer_id, service_id, **staff_id** (NULL = unassigned), date, time_slot, status. |
| `customers` | Kupci. salon_id, phone (unique), name, email, no_show_flag, last_visit_date, deleted_at. |
| `loyalty_events` | Sistem lojalnosti — visit/redeem događaji. |
| `blocked_slots` | Triša/staff blokira slotove (godišnji, pauza). NULL time_slot = ceo dan. |
| `products` | Shop proizvodi. salon_id, slug, name_sr, name_lat, brand, price, stock, category, image_url, badge, active. |
| `product_categories` | Shop kategorije (slug, name_sr, name_lat). |
| `orders` | Porudžbine. salon_id, customer_id, items JSONB, total, status, pickup_note. |
| `gallery_images` | Slike rada Triše. salon_id, image_url, sort_order. |
| `site_content` | Editabilan content sajta (hero, about, footer texts) — Triša menja iz `/admin/sajt`. |
| `site_announcements` | Banner-i preko sajta (npr. "Zatvoreno 1.5."). |
| `error_log` | Frontend errors za debugging, 30-day retention. |

### RLS (Row-Level Security)
Svaka tabela ima RLS uključen. Glavna provera je SQL funkcija `is_admin_of(salon_id)` koja vraća TRUE ako trenutni `auth.uid()` ima admin_users red u tom salonu (i nije isključen niti obrisan). Public read polise dozvoljavaju anonimno čitanje samo aktivnih sadržaja. Insert polise dozvoljavaju anon upis na `bookings`, `orders`, `customers` (kako bi javni booking radio bez login-a). Mutacije svega ostalog → owner samo.

---

## 5. Multi-staff (kako Triša upravlja zaposlenima)

### Stanja zaposlenog
| Stanje | is_active | deleted_at | Login? | Vidi se gde |
|---|---|---|---|---|
| Aktivan | TRUE | NULL | ✓ | AKTIVNI lista |
| Pauza | FALSE | NULL | ✗ | AKTIVNI (greyed) |
| Obrisan | * | timestamp | ✗ | ARHIVA |

### Kako se kreira
`/admin/podesavanja → ZAPOSLENI` tab → "+ DODAJ" → forma:
- Ime (obavezno)
- Prezime, telefon, email (opciono — za HR arhivu)
- PIN (obavezno, jedinstven po salonu)

### Šta staff vidi
- **TERMINI**: svoje + sve "Slobodne" (unassigned) bookings. Svaki red ima badge "СЛОБОДНО / ЈА / ime kolege".
- **STATISTIKA**: samo lična zarada (status='done', staff_id = on/ona), grupisana dnevno/nedeljno/mesečno.
- **MUŠTERIJE**: samo kupce sa kojima je obavio bar jedan termin (status='done').

### Šta staff NE vidi (isključivo Triša)
USLUGE, SHOP (proizvodi/kategorije), GALERIJA, SAJT (content), BLOKIRANO, PODEŠAVANJA, retention statistika, novi kupci uopšteno.

### "Decide-in-person" model — ključna logika
Online termini koje upiše kupac dolaze sa **`staff_id = NULL`**. Triša i staff se uživo dogovore ko će šišati. Onaj ko završi i klikne **DONE** → sistem stampuje `staff_id = me` (samo ako je bilo NULL). Zarada ide tom radniku. Walk-in koje upisuje staff stampuju se odmah na njega.

### HR arhiva
Kad Triša obriše zaposlenog (🗑 dugme + 2-step confirm), red se ne briše iz tabele već se postavi `deleted_at`. Postojeće rezervacije sa njegovim `staff_id` ostaju netaknute (statistika i istorija intaktna). Arhiva sekcija prikazuje obrisane sa: ime + prezime, telefon, email, datum brisanja, lifetime broj jedinstvenih mušterija.

---

## 6. Booking sistem — duration-aware overlap

### Problem
Naivni booking proverava samo da li je slot u DB-u. To dozvoljava overlap: 90min termin u 13:00 + 30min termin u 13:30 = preklop 13:30–14:00.

### Rešenje (`web/src/lib/booking/slots.ts`)
Half-open interval test: `[A_start, A_start + A_dur)` preseca `[B_start, B_start + B_dur)` ako i samo ako `A_start < B_end AND B_start < A_end`.

Ovo je jezgro `computeBlockedSlots(durationMin, busyRanges)` — vraća set svih 30-min grid slotova koji bi pravili konflikt za uslugu date dužine.

### Race-condition zaštita
- **Picker** (UI) prikazuje slot kao zauzet odmah pri promeni izabrane usluge.
- **Server submit** ponovo proverava overlap pre insert-a (drugi sloj).
- **DB unique index** (`migration 004`) hvata exact-match duplikate kao backstop.

PG exclusion constraint (btree_gist + tsrange) za potpuni overlap-na-DB-nivou je odložen za V1.1 — application check je dovoljan za V1 traffic.

---

## 7. Design system

### Vizuelni identitet
- **Boje**:
  - `--brown-950: #1A0F05` — pozadina (skoro crna, topla)
  - `--brown-700` — sekundarni tamni ton
  - `--mustard: #D4A53A` — primarni accent (logo, CTA, NEXT badge)
  - `--cream: #F5E9D0` — primarni tekst
  - `--danger` — crveno za upozorenja i delete
  - `--success` — zeleno za pozitivne metrike

- **Tipografija** (sve preko Google Fonts):
  - **Cormorant Garamond** italic — hero naslovi, akcenat, romantičan ton
  - **Oswald** — labele, metrike, large numerals
  - **Playfair Display** — proizvodi
  - **JetBrains Mono** — meta-data, ID-jevi, vremena, telefoni
  - **Inter** — body text fallback

- **Logo**: kvadratni asset (1231×1231 master) sa svetlosivom pozadinom `#F7F7F7`. Iste varijante na navigaciji, footer-u, OG karticama, PWA ikonama.

### UI principles
- **Mobile-first** — admin se primarno koristi na telefonu (Triša u salonu).
- **Bottom nav** umesto sidebar-a za admin (palac dohvat).
- **3-tab layout** za listove sa vremenskim pregledom (Danas / Nedelja / Kalendar).
- **Half-sheet modali** za detalje (booking detail, customer detail).
- **Status dot + badge** kombinacija — boja + tekst za status (potvrđeno, gotovo, otkazano, no-show).
- **Bilingual rendering**: SR Cyrillic + Latin u istom DOM-u, switch preko `<html data-lang>` atributa, CSS `[data-lang=sr] [data-lat] { display: none }`.

### Brand Voice (Triša copy)
- Topao, neformalan, malo dosetljiv ("Vidimo se uskoro. — Triša")
- Bez zvanične korporacijske distance
- Email potpis uvek "— Triša" (kratko)

### Komponente
- `SiteNav` — mustard mark + tekst "Berbernica Triša"
- `SiteFooter` — sive ikone, social linkovi (conditionally), imprint
- `SiteBanner` — ad-hoc obaveštenja (npr. "Zatvoreno 1.5.")
- `SummaryBar` — pojavljuje se u koraku 2/3 booking flow-a
- `JsonLd` — server component koji injektuje structured data

---

## 8. Sigurnost

### Identifikacija
- PIN logovi nikad nisu plain text u DB; bcrypt hash.
- Service Role key se koristi samo server-side (nikad u client bundle).
- Anon key (publikovan u client bundle) je gated kroz RLS — ne može da pristupi ničemu osim public read polisama.

### CSRF + headers
- HSTS preko Vercel-a (production HTTPS).
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` skida nepotrebne API-je (camera, mic, geolocation, payment, USB).
- CSP nije postavljen u prvoj iteraciji (zahteva inventarisanje inline stilova / iframe-ova) — V1.1.

### Privacy & GDPR
- Privatnost stranica (`/privatnost`) i Uslovi (`/uslovi-koriscenja`) — bilingual, 10/11 sekcija svaki.
- Cookie notice — minimalan, samo za tehničke kolačiće (nema tracking-a po default-u).
- Plausible je no-cookie i privacy-first ako se aktivira.

### Anti-cheat / abuse
- PIN brute-force: salon-wide rate limit (5 fail = 10min lockout).
- Phone-based customer dedup: jedan broj telefona = jedan red u customers (per salon).
- Booking unique constraint: `(salon_id, date, time_slot)` partial unique kao race-backstop.

### Backup
- GitHub Actions noćni `pg_dump` → 90-dnevna retencija u GitHub artifact (free Supabase tier ne ima auto-backup).

---

## 9. Hosting / infrastruktura

### Vercel
- Project: `berbernicatrisas-projects/berbernica`
- Root Directory: `web/`
- Framework: Next.js (auto-detect)
- Node 24.x
- Sve auto-deploy preko `git push origin main` (Vercel watcher)
- Custom domain: pending (kupuje Stefan)

### Supabase
- Project: `https://ljxovmahbyxgyyttvldv.supabase.co`
- Plan: Free tier
- Free tier limiti:
  - 500MB DB storage
  - 1GB Storage bucket
  - 2GB egress/mesec
  - 50K MAU
- Migracija sa Free → Pro ($25/mo) trigger:
  - DB > 400MB ili Storage > 800MB ili egress > 1.5GB
  - Ili kad Triša traži automatske backup-ove + branche

### Email (Resend)
- Free tier 3000/mesec
- Trenutno koristi `onboarding@resend.dev` (pre-domain)
- Plug-in: kad domain stigne, dodati DNS rekorde (DKIM/SPF/DMARC), verifikovati u Resend, prebaciti `RESEND_FROM_EMAIL=noreply@<domain>`

### Plausible
- Pending — Triša signup-uje kad bude htela analytics

---

## 10. Email pipeline

| Trigger | Šalje | Prima | Šta | Funkcija |
|---|---|---|---|---|
| Online rezervacija | Server | Kupac | Potvrda termina + ID | `sendBookingConfirmation` |
| Walk-in admin upis | Server | Kupac | Ista potvrda (ako kupac ima email) | `sendBookingConfirmation` |
| Online porudžbina | Server | Triša | Notifikacija sa stavkama + telefon | `sendOrderEmail` |
| Online porudžbina | Server | Kupac | Potvrda primljene porudžbine | `sendOrderConfirmationToCustomer` |
| Triša obeleži "ready" | Server | Kupac | "Dođi po porudžbinu" | `sendOrderReadyEmail` |

Sve template-i na srpskoj latinici, brand-ovani sa logo + boje + Triša copy. Šalju se best-effort (Promise.allSettled) — ako email padne, transakcija (booking/order) se ne rolluje.

---

## 11. SEO

### Implementirano
- **JSON-LD structured data**: LocalBusiness + Service array + Product list. Dynamic, čita iz DB.
- **Sitemap** auto-generated (`/sitemap.xml`) — uključuje home, shop, /shop/[slug] proizvode, statične rute.
- **robots.txt** — dozvoljava sve, blokira `/admin/`, `/api/`.
- **llms.txt** — AI-discovery friendly (kad LLM crawler dođe).
- **OpenGraph** + Twitter Card meta tagovi sa logo-source.png kao fallback slikom.
- **`<html lang="sr-Latn">`** + `data-lang` switch za SR Cyrillic preko CSS.
- **HSTS, security headers, no_index admin** rute.
- **Page titles** + bilingual fallback content.

### Phase C SEO re-audit (preporučeno)
Trči `technical-seo-checker` + `geo-platform-optimizer` + PageSpeed Insights posle plug-in-a custom domena, generiše comparison report. Effort ~1.5h.

---

## 12. Skoji development workflow

### Lokalni dev
```bash
cd web
npm install
npm run dev          # pokreće na :3050
```
Kreirati `web/.env.local` sa kopijom iz `web/.env.example`, popuniti realne ključeve.

### Migracije
```bash
PGPASSWORD='<pwd>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres \
  -f supabase/migrations/00X_name.sql
```
Sve migracije su idempotentne (`IF NOT EXISTS`, `OR REPLACE`) — bezbedno re-run.

### Deploy
```bash
git push origin main           # auto-deploy preko Vercel git watcher-a
# OR
vercel deploy --prod --yes     # CLI deploy iz repo root-a
```

### Service worker
Pri svakoj promeni u `public/sw.js` precache liste, **bumpovati VERSION konstantu** (`trisa-sw-vX → vX+1`) da klijenti dobiju nov keš. SW-ov activate handler briše stari keš automatski na verzionoj promeni.

---

## 13. PWA

- `public/manifest.json` definiše ime, ikone, theme color, orientation.
- `public/sw.js` (hand-rolled, no Workbox) implementira:
  - Cache-first za statičke asset-e (icons, fonts, legacy)
  - Network-first za public navigacije sa fallback na keš + `/offline`
  - Network-only za `/admin/*` i `/api/*` (auth-bound, mutacije)
  - Pass-through za cross-origin (Supabase Storage, Resend)
- `/offline` page se renderuje kad sve drugo padne.
- Aplikacija se može "Install"-ovati iz Chrome/Safari/Edge address bar-a.

---

## 14. Ono što nije u skopu V1 (deferred to V1.1+)

- **i18n full** (sr-Latn + sr-Cyrl + en) — V1.1, 65% confidence + medium blast-radius, odloženo
- **Push notifikacije** — drop, ne treba
- **Customer barber picker** na javnom booking-u — pojavlj kad Triša zaposli stalno
- **Public booking same-day cutoff** (24h advance only) — V1.1
- **Loyalty redeem flow front-end** — back-end je tu, UI bi-direktan koristi V1.1
- **Bulk customer ops** (bulk cancel, bulk message) — V1.1+
- **Owner edit forme za zaposlene** (promena imena, telefona) — trenutno se može preko DB direktno; V1.1 inline edit
- **PG exclusion constraint** za booking overlap (btree_gist + tsrange) — application check je dovoljan trenutno
- **Analytics dashboard u admin-u** — Plausible eksterno

---

## 15. Stanje deploy-a (2026-05-02)

- **Production URL**: `https://berbernica-ruby.vercel.app`
- **GitHub HEAD**: `main`, ažuran sa Vercel produkcijom
- **Migracije primenjene**: 001-009
- **Build**: clean (TypeScript strict, no warnings)
- **Routes**: 30 stranica generated, prosečan First Load JS 87.4 kB
- **Confidence V1 release**: 90%

---

## 16. Kontakti i pristup

- **GitHub repo**: `BerbernicaTrisa/Berbernica` (private)
- **Vercel project**: `berbernicatrisas-projects/berbernica` (admin pristup: berbernicatrisa@gmail.com)
- **Supabase dashboard**: `https://supabase.com/dashboard/project/ljxovmahbyxgyyttvldv`
- **Admin login** (production): `https://berbernica-ruby.vercel.app/admin/login` — Trišin PIN
- **Resend dashboard**: posredstvom Stefan-ovog Resend računa

---

## 17. Šta Triša treba da uradi posle handover-a

### Odmah po preuzimanju (15-20 min)
1. Login u Supabase dashboard, postavi email alerts na 80% threshold za DB / Storage / Egress / MAU.
2. Login u Vercel, verifikuj da auto-deploy radi (push + commit u repo + sačekaj alias update).
3. Otvori `/admin/podesavanja → PIN` tab → promeni PIN sa default-a `1234` u svoj.

### Kad domain stigne (~45 min)
1. Reggie domain, postavi DNS A record na Vercel.
2. U Vercel project Settings → Domains, dodaj domain.
3. Update env var `NEXT_PUBLIC_SITE_URL` u Vercel (Production scope) na novi domain.
4. U Resend dashboard: dodaj custom domain, prati DNS verifikaciju (DKIM/SPF/DMARC).
5. Update env var `RESEND_FROM_EMAIL=noreply@<novi-domain>`.
6. Redeploy.

### Stalna upotreba
- **Termini**: `/admin/termini` — DANAS / NEDELJA pregled, klik na booking otvara detalj sa actions (POTVRDI, GOTOVO, NO-SHOW, OTKAŽI).
- **Walk-in**: `/admin/termini/novi` — manual upis ako neko bez online rezervacije dođe.
- **Mušterije**: `/admin/musterije` — pretraga po telefonu/imenu, klik na profil, lojalnost, no-show bedževi, brisanje.
- **Statistika**: `/admin/statistike` — DAN/NEDELJA/MESEC, prihod, top usluge, retention, breakdown po zaposlenom.
- **Sajt content**: `/admin/sajt` — hero, about, footer, working hours.
- **Galerija**: `/admin/galerija` — upload slika svog rada (maks 2MB svaka).
- **Shop proizvodi**: `/admin/shop/proizvodi` — dodavanje/menjanje/skidanje sa lager-a; **inline + NOVA** za dodavanje kategorije bez napuštanja forme.
- **Shop porudžbine**: `/admin/shop/porudzbine` — pending → ready → picked_up flow.
- **Banner**: `/admin/podesavanja → BANNER` — ad-hoc obaveštenja (npr. "Zatvoreno za godišnji 1-15. avgusta").
- **Zaposleni**: `/admin/podesavanja → ZAPOSLENI` — dodavanje, brisanje, reset PIN-a.
- **Blokirani slotovi**: `/admin/blokirano` — godišnji, pauze, dani off.

### Backup
GitHub Actions automatski radi `pg_dump` svake noći → artifact se čuva 90 dana. Pristup preko GitHub Actions tab u repo.

---

## 18. Glossary

| Term | Šta znači |
|---|---|
| **Owner** | Triša — pun pristup svemu |
| **Staff** | Zaposleni — ograničen pristup |
| **Walk-in** | Booking koji admin manually upiše (kupac došao bez online rezervacije) |
| **Slot** | 30-minutni vremenski blok u rasporedu |
| **DONE stamp** | Klikom na "GOTOVO" status, sistem označi koji barber je završio termin (za atribuciju zarade) |
| **Soft-delete** | "Brisanje" koje samo postavlja `deleted_at` flag — red ostaje u DB-u za istoriju |
| **Booking flow** | 4-koračni proces na `/zakazivanje`: izaberi uslugu → datum → vreme → ime+telefon |
| **Loyalty** | Sistem nagrade — 6 obavljenih šišanja = 1 besplatno |

---

**Kraj dokumenta.** Za dodatne reference: `docs/release-master-plan-2026-04-30.md` (master plan), `docs/seo/*` (SEO audit + pickup), `docs/admin-audit.md` (admin pregled), `docs/manual-test-checklist.md` (checklist za QA).
