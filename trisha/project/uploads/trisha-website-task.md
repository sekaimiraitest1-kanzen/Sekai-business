# Berbernica Triša — Website & PWA Development Task

## Overview

Build a complete **PWA (Progressive Web App) website** for "Berbernica Triša", a traditional barbershop in Batajnica, Zemun, Serbia. The attached PDF contains the full design system, UI mockups, and component specifications created for this project. Use them as the **single source of truth** for all visual and UX decisions.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database + Auth:** Supabase (PostgreSQL + Row Level Security)
- **Email:** Resend
- **Hosting:** Vercel
- **PWA:** next-pwa
- **Language:** TypeScript

---

## Design System (from attached PDF)

All design decisions are documented in the attached PDF. Key tokens:

### Colors
```
--mustard:       #D4A53A  (primary accent — CTA, links, highlights)
--mustard-bright:#E8B84A  (hover states)
--mustard-deep:  #B08825  (shadows, borders)
--mustard-soft:  #F0D58F  (subtle backgrounds)
--brown-950:     #1A0F05  (primary dark — hero bg, nav)
--brown-900:     #2B1810  (dark surface)
--brown-700:     #5C3A22  (secondary text, metadata)
--cream:         #F5E9D0  (card backgrounds)
--cream-warm:    #EDD9B0  (warm cream)
--paper:         #FAF3E3  (main background — light mode)
--success:       #6B8E4E
--danger:        #A63D2A
```

### Typography
```
Display:  Playfair Display (900, italic) — hero titles, prices, names
Heading:  Oswald (400–700, uppercase) — sections, buttons, labels
Body:     Inter (400–600) — all long-form text
Mono:     JetBrains Mono (400–500) — metadata, times, codes
```

### Spacing
8pt grid. Base unit 4px, scale: 4/8/12/16/24/32/48/64/96/128px.

---

## Database Schema

```sql
-- Multi-tenant from day 1
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  working_hours JSONB,
  theme JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phone as primary identifier (not email)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  no_show_count INTEGER DEFAULT 0,
  no_show_flag BOOLEAN DEFAULT FALSE,
  utm_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id, phone)
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  name_sr TEXT NOT NULL,
  name_lat TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  price INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  customer_id UUID REFERENCES customers(id),
  service_id UUID REFERENCES services(id),
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  status TEXT DEFAULT 'confirmed',
  -- status: pending | confirmed | done | no_show | cancelled
  utm_source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  price INTEGER NOT NULL,
  category TEXT,
  stock INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  badge TEXT -- 'new' | 'hot' | 'trisha' | null
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  customer_id UUID REFERENCES customers(id),
  items JSONB NOT NULL,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  pickup_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  customer_id UUID REFERENCES customers(id),
  event_type TEXT NOT NULL, -- 'visit' | 'reward'
  points INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin', -- 'admin' | 'superadmin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Application Routes

```
/                          → Public website (home)
/zakazivanje               → Booking flow (guest or logged in)
/shop                      → Product listing
/shop/[slug]               → Product detail
/nalog                     → Customer account (login/register)
/nalog/istorija            → Booking history (registered users only)
/nalog/porudzbine          → Order history

/admin                     → Admin dashboard (protected)
/admin/termini             → Bookings: today + week view
/admin/musterije           → Customer list + search by phone
/admin/musterije/[id]      → Customer profile
/admin/usluge              → Services CRUD
/admin/proizvodi           → Products CRUD
/admin/galerija            → Gallery upload
/admin/sajt                → Website content editor
/admin/metrike             → Analytics dashboard
```

---

## Feature Specifications

### 1. Public Website

Refer to attached PDF for full visual specification. Sections:

- **Nav** — sticky, dark, SR/LAT language switcher, "Zakaži" CTA always visible
- **Hero** — full viewport, barbershop pole SVG illustration, live "open today" indicator
- **O nama** — story text + 4 stats cards (years, customers, rating, price)
- **Usluge** — editorial list with large italic prices, hover animation
- **Galerija** — Instagram-style grid with grid-breaking (tall + wide items)
- **Utisci** — 3 review cards with Google attribution
- **Lokacija** — animated pin map + hours card with today highlighted
- **CTA band** — pre-footer booking push
- **Footer** — 4 column layout

**Language switcher:** SR (Cyrillic, default) / LAT (Latin). Toggle in nav. Use `data-lang` attribute on `<html>` element. All text duplicated in both scripts using `data-sr` and `data-lat` attributes.

**PWA requirements:**
- `manifest.json` with name, icons (192/512px), theme color `#1A0F05`, background `#FAF3E3`
- Service worker with offline fallback page
- Installable on iOS and Android home screen

---

### 2. Booking System

**Guest booking (no account required):**
```
Step 1: Choose service (visual card selection)
Step 2: Choose date (horizontal strip, last 5 days + calendar button for future dates)
Step 3: Choose time slot (grid, disabled = taken, crossed = unavailable)
Step 4: Enter name + phone (required), email (optional)
Step 5: Confirmation screen
```

**Registered user booking:**
Same flow, steps 1-3 identical, step 4 skipped (data pre-filled).

**Slot logic:**
- Fetch available slots: `GET /api/slots?date=YYYY-MM-DD&service_id=X`
- Slot = taken if booking exists for that time + duration overlaps
- Block slots outside working hours
- Allow booking max 30 days in advance

**No-show flag:**
- If customer phone has `no_show_flag = true` → show warning banner on booking confirmation (Triša sees this in admin)
- Do NOT block booking automatically in MVP — Triša decides

**UTM tracking:**
- Read `?utm_source=` from URL on booking page load
- Store in `bookings.utm_source` on creation
- Default sources: `instagram`, `google`, `direct`

---

### 3. Customer Identification

**Phone as primary key:**
- Every customer = unique phone number per salon
- Guest books → create `customers` row with phone + name only
- If customer registers later with same phone → merge records (keep booking history)
- Admin search: search customers by phone number

**Profile merge logic:**
```typescript
async function mergeGuestWithAccount(phone: string, userId: string) {
  // Find guest customer record by phone
  const guest = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .single()

  if (guest) {
    // Update all bookings to point to registered user
    await supabase
      .from('bookings')
      .update({ customer_id: userId })
      .eq('customer_id', guest.id)

    // Copy no_show data
    await supabase
      .from('customers')
      .update({
        no_show_count: guest.no_show_count,
        no_show_flag: guest.no_show_flag
      })
      .eq('id', userId)

    // Delete guest record
    await supabase.from('customers').delete().eq('id', guest.id)
  }
}
```

---

### 4. Registered User Features

Users who create an account get:

- Email confirmation after booking
- Digital receipt after visit (PDF generated server-side, sent via Resend)
- Booking history at `/nalog/istorija`
- Loyalty progress visible (e.g. "6/10 visits to free haircut")
- Special discounts (applied by Triša manually in MVP)
- PWA push notifications (booking reminders)

**Digital receipt fields:**
- Date + time of visit
- Service name + duration
- Price paid
- Any discount applied
- No-show surcharge note (if applicable)
- Salon address + contact
- "Thank you" message with next booking CTA

---

### 5. No-Show Surcharge (30%)

- Triša marks booking as `no_show` in admin panel
- System increments `customers.no_show_count`
- Sets `customers.no_show_flag = true`
- Next time that phone number books → admin sees red warning: "⚠️ Ova mušterija nije se pojavio prethodni put. Možeš primeniti 30% surcharge."
- Triša manually decides whether to apply it
- Surcharge is noted in the digital receipt if applied
- Flag can be manually cleared by admin

---

### 6. Retention Metrics

**45-day inactive alert:**
- Cron job runs daily: `SELECT * FROM customers WHERE last_visit < NOW() - INTERVAL '45 days'`
- Admin dashboard shows list: "Mušterije koje nisu bile 45+ dana"
- If customer has email → system queues reminder email (Triša approves batch or individually)

**Retention panel in admin:**
```
- Total active customers (visited in last 30 days)
- At-risk customers (31-45 days since last visit)
- Churned customers (45+ days)
- Average visit frequency
- Top 10 most loyal (by visit count)
```

---

### 7. Admin Panel

**Authentication:**
- Supabase Auth with role-based access
- Admin route protection via middleware
- Separate login page at `/admin/login`

**Booking management (refer to PDF for UI):**
- Today view: timeline with time slots, customer name, service, status
- Week view: heatmap grid (7 days × working hours)
- Status actions per booking: Done ✓ / No-show ✗ / Cancel
- FAB button to add manual booking (walk-in)
- Add booking form: customer name + phone lookup, service select, date + time

**Customer profile:**
- Name, phone, email
- Visit count + last visit date
- No-show count + flag toggle
- Full booking history
- UTM source (how they found the salon)
- Loyalty points / visit count toward reward

**Analytics dashboard:**
```
Cards (daily/weekly/monthly toggle):
- Total revenue
- Bookings count
- New customers (new phone numbers)
- No-show rate
- Capacity utilization (%)

Charts:
- Revenue by day (bar chart)
- Bookings by UTM source (pie/donut)
- Top services by count

Lists:
- Most loyal customers (top 10)
- At-risk customers (45+ days)
- Customers with no-show flag
```

**Website content editor:**
- Edit "O nama" text (SR + LAT versions)
- Edit working hours per day
- Upload / reorder gallery images (drag and drop)
- Edit services: name, price, duration, active toggle, sort order
- Edit products: name, brand, price, category, stock, image upload, badge, active toggle

---

### 8. Shop

Refer to PDF for full visual specification.

- Product grid (4 columns desktop, 2 mobile)
- Filter by category (chips)
- Product detail modal (click opens overlay)
- Add to cart with toast notification
- Cart drawer (slide in from right)
- Checkout: name + phone + pickup note → order stored in DB → email to Triša
- Out of stock state (greyed out, minus button disabled)
- Product badges: NEW / HOT / TRIŠA

**MVP checkout:** No online payment. Order submitted → Triša gets email with order details → customer picks up in salon and pays cash or card.

---

### 9. PWA Configuration

```json
// public/manifest.json
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

Service worker: cache-first for static assets, network-first for API routes, offline fallback page.

---

## Content Placeholders

Replace these with real content from Triša before launch:

```
SALON_NAME:      "Берберница Триша"
SALON_ADDRESS:   "[Tačna adresa, Batajnica]"
SALON_PHONE:     "[Broj telefona]"
SALON_EMAIL:     "[Email adresa]"
SALON_INSTAGRAM: "[@instagram_handle]"
GOOGLE_MAPS_URL: "[Google Maps link]"

SERVICES: (get from Triša — full list with prices and durations)
PRODUCTS: (get from Triša — kozmetika lista)
PHOTOS:   (get from Instagram or photographer)
```

---

## Key UX Principles (from design system)

1. **Cyrillic first** — default language is Serbian Cyrillic. Latin is a toggle option.
2. **Warm, not cold** — use `#1A0F05` (dark brown) instead of pure black. Use `#FAF3E3` (paper) instead of white.
3. **Phone = identity** — never assume a customer by name alone. Phone number is the unique identifier.
4. **Booking in 3 taps** — service → date → confirm. If it takes more, simplify.
5. **900 RSD is a feature** — show prices large and proud. Affordability is the brand.
6. **Multi-tenant from day 1** — every DB query must filter by `salon_id`. Never expose data across salons.

---

## Deliverables

### MVP (Phase 1)
- [ ] Public website — all 7 sections, fully responsive
- [ ] PWA manifest + service worker + offline page
- [ ] Booking flow (guest + registered)
- [ ] Customer identification by phone
- [ ] Admin panel: bookings, customers, services editor
- [ ] Admin panel: website content editor
- [ ] Admin panel: products/shop editor
- [ ] Shop: listing, detail, cart, checkout
- [ ] No-show flag system
- [ ] UTM source tracking
- [ ] Basic metrics dashboard
- [ ] SR/LAT language switcher
- [ ] Deploy to Vercel + Supabase

### Phase 2 (after MVP)
- [ ] SMS/Viber reminders (Twilio)
- [ ] Loyalty program with rules engine
- [ ] Digital receipts (PDF via Resend)
- [ ] Retention alerts (45-day cron)
- [ ] Push notifications (PWA)
- [ ] Online payment (Stripe or PaySec)

### Phase 3 (multi-tenant platform)
- [ ] Salon onboarding flow
- [ ] Per-salon theming
- [ ] Subdomain routing
- [ ] Super-admin panel
- [ ] Billing (Stripe Subscriptions)

---

## Notes for Claude

- The attached PDF contains all screens: design system, customer app mockups (splash, home, booking, confirmation, cancel flow, calendar picker), admin app mockups (login, today, week, appointment detail, add booking, services, statistics), and the full website design.
- Follow the design system exactly — colors, fonts, spacing, component patterns are all specified.
- Do not use Inter or system fonts for display/heading elements. Use Playfair Display + Oswald as specified.
- Every component must work in both Cyrillic and Latin — use the `data-lang` pattern documented in the design system.
- Build multi-tenant from the start — `salon_id` on every table, every query filtered by it.
- When in doubt about a design decision, refer to the PDF. When in doubt about a technical decision, prefer simplicity and the ability to iterate quickly.
