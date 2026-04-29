# Берберница Триша — Kompletan kontekst projekta

> Generisano 2026-04-28. Handoff dokument za Claude Code terminal sesiju.
> Izvorni dizajn: `trisha/project/` HTML prototipi + `trisha/project/uploads/trisha-website-task.md`

---

## 1. Pregled projekta

**Šta se gradi:** PWA (Progressive Web App) website za "Берберница Триша" — tradicionalna berbernica u Batajnici, Zemun, Srbija.

**Vlasnik:** Triša (admin korisnik)
**Ciljna publika:** Mušterije iz Batajnice/Zemuna, pretežno muškarci

**Jezik:** Srpski ćirilični (default) + srpski latinični (toggle)
- Svaki tekst u UI postoji u oba pisma
- Implementacija: `data-lang="sr"` ili `"lat"` na `<html>` elementu
- CSS: `[data-lang="sr"] [data-lat] { display: none }` i obrnuto
- Svaki tekstualni element ima `data-sr="..."` i `data-lat="..."` atribute (ili dva `<span>` elementa)

---

## 2. Tech stack

| Stavka | Vrednost |
|--------|---------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| DB + Auth | Supabase (PostgreSQL + RLS) |
| Email | Resend |
| Hosting | Vercel |
| PWA | next-pwa |
| Jezik koda | TypeScript |

---

## 3. Design System

### Boje (CSS custom properties)

```css
--mustard:       #D4A53A   /* Primarna akcent boja — CTA, cene, highlight */
--mustard-bright:#E8B84A   /* Hover state za mustard */
--mustard-deep:  #B08825   /* Senke, tamne bordure */
--mustard-soft:  #F0D58F   /* Suptilni mustard background */
--brown-950:     #1A0F05   /* Najdublji tamni — hero bg, nav, admin bg */
--brown-900:     #2B1810   /* Tamna površina, kartice u dark sekcijama */
--brown-700:     #5C3A22   /* Sekundarni tekst, meta info, muted */
--cream:         #F5E9D0   /* Kard backgroundi u light sekcijama */
--cream-warm:    #EDD9B0   /* Toplija krema — hover state za kartice */
--paper:         #FAF3E3   /* Glavni background — light mode */
--success:       #6B8E4E   /* Zelena — potvrda, "otvoren", on-track */
--danger:        #A63D2A   /* Crvena — greške, no-show upozorenja */
```

### Tipografija

| Font | Težine | Upotreba |
|------|--------|---------|
| **Cormorant Garamond** | 600, 700 italic | Hero title, section titles, service names, stat values (serif display) |
| **Playfair Display** | 700, 900 italic | Logo mark, cene, booking step title, shop title, admin stat values |
| **Oswald** | 400–700 uppercase | Nav links, sekcijske labele, dugmad, usluge labele |
| **Inter** | 400–600 | Body text, opisi (sav dugački tekst) |
| **JetBrains Mono** | 400–500 | Metapodaci, vreme, kodovi, oznake, step labele |

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Spacing

8pt grid. Baza 4px. Skala: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px`

### Radiusi

Projekat koristi uglavnom `border-radius: 2px` (gotovo sharpe ugla) ili `50%` za krugove. Nema rounded-xl. Ovo je deo "master craftsman" estetike.

---

## 4. Komponente — vizuelni rečnik

### Nav (public website)
```
position: fixed, height: 64px, bg: --brown-950
border-bottom: 1px solid rgba(212,165,58,.15)
padding: 0 48px, gap: 48px

Logo: mustard krug (36px) sa italic "T" + Oswald uppercase text "БЕРБЕРНИЦА ТРИША" / "БАТАЈНИЦА"
Links: Oswald 13px 0.08em spacing, rgba(cream,.6) → mustard na hover
Right: lang toggle + btn-primary "ЗАКАЖИ"
```

### btn-primary
```css
font-family: Oswald, 13px, 600, uppercase, 0.08em spacing
padding: 10px 24px
background: --mustard → --mustard-bright na hover
color: --brown-950
border-radius: 2px
```

### btn-ghost
```css
background: transparent, border: 1px solid rgba(cream,.3)
color: --cream → mustard na hover
border-radius: 2px
```

### Section pattern
```
padding: 96px 48px
.section-label: JetBrains Mono 11px 0.18em uppercase mustard + 24px linja ispred
.section-title: Cormorant Garamond clamp(36px,4vw,56px) 700 italic --brown-950 (ili cream za dark sekcije)
```

### Stat card
```
bg: --cream, padding: 36px 32px
val: Cormorant Garamond 52px 700 italic --mustard
label: Oswald 11px 500 uppercase --brown-700
```

### Service item (public — dark bg)
```
grid 2 kolone, border-bottom rgba(cream,.08)
service-meta: JetBrains Mono 11px 0.12em uppercase rgba(cream,.35)
service-name: Cormorant Garamond clamp(28px,3vw,44px) 700 italic --cream → mustard na hover
service-price: isti font, --mustard
```

### Service card (booking flow)
```
bg: --cream, border: 2px solid transparent, padding: 20px 24px
.selected: border-color --mustard
name: Playfair Display 22px 900 italic
price: Playfair Display 28px 900 italic --mustard
check: mustard krug 24px sa checkmark (vidljiv samo kad .selected)
```

### Gallery grid (6-col, 2-row, 280px po redu, gap: 3px)
```
.g1: span 2 col, span 2 row (velika leva slika)
.g2: span 2, .g3: span 2
.g4: span 1, .g5: span 1, .g6: span 2
hover: gradient overlay iz transparentnog ka rgba(brown-950,.7)
```

### Review card
```
bg: --cream, padding: 36px 32px
stars: mustard ★★★★★
tekst: 15px italic --brown-900, line-height 1.7
avatar: brown-700 krug, Oswald inicijali
quote mark: Playfair 80px rgba(mustard,.1) apsolutno pozicioniran
```

### Hours card
```
bg: --brown-900, border: 1px solid rgba(mustard,.12)
row: flex justify-between, border-bottom rgba(mustard,.06)
day: Oswald 13px uppercase --cream, today row: mustard boja
time: JetBrains Mono 14px --cream
closed: danger, strikethrough
```

### Product card (shop)
```
bg: --cream → cream-warm na hover
img area: 200px height, bg --brown-900 (image placeholder ili slika)
badge: absolute top-left — NEW (mustard), HOT (danger/crvena), TRIŠA (brown-700)
name: Playfair Display 16px 700 italic --brown-950
brand: JetBrains Mono 10px 0.1em --brown-700
price: Oswald 18px 700 --mustard
CTA btn: opacity 0 → 1 na hover, mustard bg "DODAJ"
out-of-stock: opacity .4, diagonal stripe overlay, dugme disabled
```

### Admin timeline item
```
bg: --brown-900, padding: 14px 16px
.next: border-color --mustard
.done: opacity .5
time: JetBrains Mono 14px --mustard
name: Oswald 15px 600 --cream
service: JetBrains Mono 11px rgba(cream,.4)
status dot: zelena (confirmed), mustard blinking (next), rgba (done)
"NEXT" badge: mustard apsolutni chip
```

### Date pill (booking)
```
min-width: 56px, padding: 12px 14px
.selected: bg --brown-950, border --brown-950, number --mustard
.disabled: diagonal stripe pattern, opacity .35
.today: border-color rgba(mustard,.3)
```

### Time slot (booking)
```
4-col grid, padding: 12px 8px
JetBrains Mono 14px
.selected: bg --brown-950, color --mustard
.taken: diagonal stripe, strikethrough, opacity .4, not clickable
```

---

## 5. Stranice i rute

```
/ (index.html)         → Javni website (home)
/zakazivanje           → Booking flow
/shop                  → Lista proizvoda
/shop/[slug]           → Detalj proizvoda
/nalog                 → Customer login/register
/nalog/istorija        → Istorija termina (samo za registrovane)
/nalog/porudzbine      → Istorija porudžbina

/admin                 → Admin dashboard
/admin/termini         → Termini — danas + nedelja
/admin/musterije       → Lista mušterija, search po telefonu
/admin/musterije/[id]  → Profil mušterije
/admin/usluge          → Usluge CRUD
/admin/proizvodi       → Proizvodi CRUD
/admin/galerija        → Upload galerije
/admin/sajt            → Editor sadržaja website-a
/admin/metrike         → Analytics dashboard
/admin/login           → Admin login
```

---

## 6. Sekcije javnog website-a (index.html)

### 1. Nav
Fiksan, tamni, uvek vidljiv "ЗАКАЖИ" CTA.

### 2. Hero
- Full viewport (min-height: 100vh)
- Background: `url(barbershop-photo)` + `--brown-950` fallback
- Overlay: radial gradient (tamna odozdo + blago od centra)
- "Otvoreno danas" badge: gornji levi ugao, zelena boja, pulsing dot, JetBrains Mono
- Center content: eyebrow label + Cormorant title + Inter subtitle + dva dugmeta (primary + ghost)
- Hero badges: 4 statistike (godine, mušterije, ocena, cena) u Cormorant Garamond italic mustard

### 3. O nama
- 2-col grid: levo tekst (Inter, --brown-700), desno 2×2 stats grid
- Stats: Cormorant 52px italic mustard vrednost + Oswald label
- "Loyalty program" line u Oswald mustard

### 4. Usluge
- Dark bg (--brown-950)
- 2-col lista usluga, editorial stil — velika italic cena desno, naziv levo
- Hover: naziv menja boju u mustard
- Footer: "cene se mogu razlikovati" disclaimer + Zakaži CTA

### 5. Galerija
- Bg: --brown-900
- 6-col grid, 2 rows, 280px visina, gap 3px
- Grid-breaking layout (velika slika spans 2×2)
- Hover: gradient overlay
- "Pogledaj na Instagramu" link desno od naslova

### 6. Utisci
- 3 review kartice (cream bg, italic tekst, krug avatar, Google attribution)
- Dekorativni " quote mark u mustard

### 7. Lokacija
- Dark bg
- 2-col: levo mapa placeholder sa animiranim pinom, desno hours card
- Hours card: svaki dan u nedelji, današnji dan highlighted u mustard
- Ispod: adresa + telefon + direktne linkove

### 8. CTA bend (pre footera)
- Dark bg, centered, Cormorant naslov + primary btn

### 9. Footer
- 4-col: logo+opis / usluge linkovi / radno vreme / kontakt
- Bottom bar: copyright + social linkovi

---

## 7. Booking flow (booking.html)

5 koraka. Progress bar na vrhu (dots sa labelama: УСЛУГА / ДАТУМ / ТЕРМИН / ПОДАЦИ / ПОТВРДА).

### Korak 1 — Izbor usluge
Vertikalna lista service cards. Klik selektuje (border mustard + check mark).
Summary bar se pojavljuje ispod odabira.

### Korak 2 — Izbor datuma
Horizontalni strip (date pills, scroll). Poslednih 5 dana + "+ dana" dugme za calendar.
Prošli dani: diagonal stripe, disabled.

### Korak 3 — Izbor termina
4-col time grid. Taken: strikethrough + disabled. Selected: dark bg + mustard text.

### Korak 4 — Podaci
Za goste: ime + telefon (obavezno) + email (opciono).
Za ulogovane: preskočeno, podaci predpopunjeni.

### Korak 5 — Potvrda
Rezime sa svim podacima. Primarna boja za potvrdu. Možda email ako je unet.

### API
```
GET /api/slots?date=YYYY-MM-DD&service_id=UUID
→ Vraća dostupne termine (filtrira prema trajanju usluge i existing bookings)
```

---

## 8. Shop (shop.html)

### Struktura
- **Nav**: logo + cart dugme sa brojem stavki (broj u mustard krugu)
- **Shop hero**: dark bg, Playfair title, stats (broj proizvoda, brendovi)
- **Filter bar**: sticky (top: 60px), category chips (Oswald uppercase), sort dugme
- **Featured card**: 2-col dark card — slika levo + content desno (istaknut proizvod)
- **Products grid**: 4-col grid, gap: 2px
- **Product detail modal**: overlay sa slikom + podacima

### Cart drawer
- Slide-in s desne strane
- Lista stavki sa količinom i ukupnom cenom
- "Naruči" → checkout forma (ime + telefon + napomena za preuzimanje)
- **Nema online plaćanja u MVP** — narudžba ide Triši na email, mušterija plaća u berbernici

### Product badge-ovi
```
NEW  → --mustard bg, --brown-950 tekst
HOT  → --danger bg, white tekst
ТРИША → --brown-700 bg, --cream tekst (Trišina preporuka)
```

---

## 9. Admin panel (admin.html — mobile-first PWA)

Admin panel je **mobilna PWA aplikacija** (max-width: 430px), ne desktop panel.

### Layout
```
Status bar (44px, dark)
Screen content (flex: 1, scroll)
Bottom tab bar (72px, 4 taba)
```

### Tab bar (4 taba sa emoji ikonama)
1. 📅 ДАНАС
2. 📆 НЕДЕЉА
3. 👥 МУШТ.
4. 📊 МЕТР.

### Ekran: Данас
- Stats row: 2×2 grid (rezervacije danas, slobodni termini, prihod danas, loyalty nagrade)
- Toggle: ДАНАС / НЕДЕЉА
- Timeline lista termina: vreme (mustard) + ime + usluga + status dot
- "NEXT" badge na sledećem terminu (blinking mustard)
- FAB dugme: "+" za dodavanje walk-in termina

### Ekran: Недеља
- Week heatmap: 7 kolona (dan) × radni sati (redovi)
- Zauzeti sloti obojeni, slobodni svetliji

### Ekran: Мушт. (Mušterije)
- Search bar po telefonu (primary lookup)
- Lista mušterija: ime + telefon + broj poseta + poslednji dolazak
- Mušterije sa no-show flagom: crvena oznaka
- Klik → profil mušterije: puna istorija termina, UTM source, loyalty progress

### Ekran: Метрике
- Cards: ukupan prihod, termini, nove mušterije, no-show rate, kapacitet
- Chart: prihod po danima (bar), termini po UTM sourcu (pie)
- Lista: top 10 najlojalnijih, rizične mušterije (45+ dana)

### Booking detail modal
- Ime, usluga, vreme, telefon
- Akcije: ✓ Obavljeno / ✗ No-show / Otkaži
- No-show → auto-incrementuje no_show_count, setuje flag

---

## 10. Database schema

### `salons`
```sql
id UUID PK
name TEXT
slug TEXT UNIQUE
address TEXT
phone TEXT
email TEXT
working_hours JSONB
theme JSONB
created_at TIMESTAMPTZ
```

### `customers`
```sql
id UUID PK
salon_id UUID FK salons
phone TEXT NOT NULL  ← PRIMARY IDENTIFIER
name TEXT
email TEXT
no_show_count INTEGER DEFAULT 0
no_show_flag BOOLEAN DEFAULT FALSE
utm_source TEXT
created_at TIMESTAMPTZ
UNIQUE(salon_id, phone)
```

### `services`
```sql
id UUID PK
salon_id UUID FK salons
name_sr TEXT NOT NULL  ← Ćirilica
name_lat TEXT NOT NULL ← Latinica
duration_min INTEGER
price INTEGER
active BOOLEAN DEFAULT TRUE
sort_order INTEGER DEFAULT 0
```

### `bookings`
```sql
id UUID PK
salon_id UUID FK salons
customer_id UUID FK customers
service_id UUID FK services
date DATE
time_slot TIME
status TEXT DEFAULT 'confirmed'
  -- 'pending' | 'confirmed' | 'done' | 'no_show' | 'cancelled'
utm_source TEXT
notes TEXT
created_at TIMESTAMPTZ
```

### `products`
```sql
id UUID PK
salon_id UUID FK salons
name TEXT
brand TEXT
description TEXT
price INTEGER
category TEXT
stock INTEGER DEFAULT 0
active BOOLEAN DEFAULT TRUE
image_url TEXT
badge TEXT  -- 'new' | 'hot' | 'trisha' | null
```

### `orders`
```sql
id UUID PK
salon_id UUID FK salons
customer_id UUID FK customers
items JSONB NOT NULL
total INTEGER
status TEXT DEFAULT 'pending'
pickup_note TEXT
created_at TIMESTAMPTZ
```

### `loyalty_events`
```sql
id UUID PK
salon_id UUID FK salons
customer_id UUID FK customers
event_type TEXT  -- 'visit' | 'reward'
points INTEGER DEFAULT 1
created_at TIMESTAMPTZ
```

### `admin_users`
```sql
id UUID PK
salon_id UUID FK salons
email TEXT UNIQUE
role TEXT DEFAULT 'admin'  -- 'admin' | 'superadmin'
created_at TIMESTAMPTZ
```

**KRITIČNO:** Svaki DB query mora da filtrira po `salon_id`. Multi-tenant od prvog dana — nikad ne eksponovati podatke između salona.

**RLS:** Sve tabele imaju RLS. Admin users pristupaju samo sopstvenom salon_id-u.

---

## 11. Feature specifikacije

### No-show surcharge (30%)

1. Admin markira booking kao `no_show`
2. System: `no_show_count++`, `no_show_flag = true`
3. Sledeći put isti telefon → admin vidi crveni banner: "⚠️ Ова мушterija није дошла прошли пут"
4. Triša ručno odlučuje da li primeni 30% surcharge
5. Flag se može ručno obrisati u admin panelu

### Customer identification (telefon kao primary key)

- Guest booking: kreira `customers` row sa brojem telefona
- Isti telefon registruje nalog → merge zapisa (zadržava booking istoriju)

```typescript
async function mergeGuestWithAccount(phone: string, userId: string) {
  const guest = await supabase.from('customers').select('*').eq('phone', phone).single()
  if (guest) {
    await supabase.from('bookings').update({ customer_id: userId }).eq('customer_id', guest.id)
    await supabase.from('customers')
      .update({ no_show_count: guest.no_show_count, no_show_flag: guest.no_show_flag })
      .eq('id', userId)
    await supabase.from('customers').delete().eq('id', guest.id)
  }
}
```

### UTM tracking

- Čita `?utm_source=` sa booking URL-a
- Čuva u `bookings.utm_source`
- Default sources: `instagram`, `google`, `direct`
- Prikazuje se u admin mušterija profilu i metrikama

### Loyalty program

- 1 poseta = 1 poen
- Milestone (npr. 10 poseta) = besplatna usluga
- Triša ručno dodeljuje nagradu u MVP
- Prikazuje se u customer profilu + booking confirmation ekranu

### 45-day retention alert

```sql
SELECT * FROM customers
  JOIN bookings ON customers.id = bookings.customer_id
  WHERE max(bookings.date) < NOW() - INTERVAL '45 days'
    AND customers.salon_id = $salon_id
```

Admin panel prikazuje: aktivni (0-30 dana), at-risk (31-45 dana), churned (45+ dana).

### PWA konfiguracija

**`public/manifest.json`:**
```json
{
  "name": "Берберница Триша",
  "short_name": "Триша",
  "description": "Твоје место за стил, традицију и добру причу.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAF3E3",
  "theme_color": "#1A0F05",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Service worker strategija:
- Cache-first: statični resursi
- Network-first: API rute
- Offline fallback: `/offline` stranica

---

## 12. Slot logika (booking API)

```typescript
// GET /api/slots?date=YYYY-MM-DD&service_id=UUID
// 1. Fetch service duration
// 2. Fetch working hours for that day
// 3. Fetch all bookings for that date (confirmed + pending)
// 4. Za svaki mogući slot: proveri da li trajanje service overlaps sa postojećim
// 5. Vrati listu slobodnih slotova
// Max 30 dana unapred
```

---

## 13. Sveobuhvatni UX principi

1. **Ćirilica first** — default `data-lang="sr"`, latin je toggle
2. **Toplo, ne hladno** — `#1A0F05` umesto pure black, `#FAF3E3` umesto white
3. **Telefon = identitet** — nikad ne identifikuj mušteriju samo po imenu
4. **Booking u 3 tapa** — usluga → datum → potvrda
5. **900 RSD je feature** — prikazuj cene veliko i ponosno
6. **Multi-tenant from day 1** — svaki query filtrira po `salon_id`

---

## 14. MVP deliverables (checklist)

### Phase 1 — MVP
- [ ] Javni website — svih 7 sekcija, potpuno responsive
- [ ] PWA manifest + service worker + offline stranica
- [ ] Booking flow (guest + registered)
- [ ] Customer identifikacija po telefonu
- [ ] Admin panel: termini, mušterije, editor usluga
- [ ] Admin panel: editor sadržaja website-a
- [ ] Admin panel: editor proizvoda/shop
- [ ] Shop: listing, detalj, korpa, checkout
- [ ] No-show flag sistem
- [ ] UTM source tracking
- [ ] Osnovni metrics dashboard
- [ ] SR/LAT language switcher
- [ ] Deploy na Vercel + Supabase

### Phase 2 (posle MVP)
- [ ] SMS/Viber podsetnici (Twilio)
- [ ] Loyalty program sa rules engine
- [ ] Digitalni računi (PDF via Resend)
- [ ] Retention alerts (45-day cron)
- [ ] Push notifikacije (PWA)
- [ ] Online plaćanje (Stripe ili PaySec)

### Phase 3 (multi-tenant platforma)
- [ ] Salon onboarding flow
- [ ] Per-salon theming
- [ ] Subdomain routing
- [ ] Super-admin panel
- [ ] Billing (Stripe Subscriptions)

---

## 15. Content placeholders (od Triše pre launcha)

```
SALON_NAME:      "Берберница Триша"
SALON_ADDRESS:   "[Tačna adresa, Batajnica]"
SALON_PHONE:     "[Broj telefona]"
SALON_EMAIL:     "[Email adresa]"
SALON_INSTAGRAM: "[@instagram_handle]"
GOOGLE_MAPS_URL: "[Google Maps link]"
WORKING_HOURS:   [od Triše — JSONB format po danu]
SERVICES:        [od Triše — lista usluga sa cenama i trajanjem]
PRODUCTS:        [od Triše — kozmetika lista]
PHOTOS:          [od Triše — sa Instagrama ili fotografa]
```

---

## 16. Fajlovi u handoff bundle-u

```
trisha/project/index.html    → Kompletan HTML prototip javnog website-a
trisha/project/booking.html  → Booking flow prototip (5 koraka)
trisha/project/shop.html     → Shop prototip (grid + filter + cart)
trisha/project/admin.html    → Admin mobile PWA prototip
trisha/project/uploads/      → Slike, screenshots, task.md, PDF dizajn
```

**PDF:** `trisha/project/uploads/berbernica-trisha-FULL-DESIGN.pdf` — kompletna design dokumentacija sa svim ekranima. Referišui ovo za sve vizuelne detalje kojih nema u ovom fajlu.

---

## 17. Napomene za implementaciju

- Ne kopirati HTML strukturu direktno — prepisati kao React/Next.js komponente
- Svaka komponenta mora raditi u oba pisma (data-lang pattern)
- `border-radius: 2px` je namerno (ne tailwind `rounded-lg`) — sharp ugaoni stil je deo brendinga
- Cene se prikazuju **bez decimala**, u Cormorant Garamond italic — to je vizuelni identity
- Admin panel je **mobile-only PWA** (max-width 430px) — ne treba desktop verzija
- Javni website je **desktop-first**, ali mora biti responsive
- Booking flow je **mobile-first** (max-width: 560px centered)
- Diagonal stripe pattern za disabled/taken elemente: `repeating-linear-gradient(45deg, rgba(92,58,34,.X) 0, rgba(92,58,34,.X) 1px, transparent 1px, transparent Xpx)`
