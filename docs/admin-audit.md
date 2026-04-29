# Trisha (Berbernica) — Admin Panel Audit
**Date:** 2026-04-29
**Build:** HEAD `ed0741c`
**Auditor:** Claude (code review, no Playwright)
**Scope:** all `/admin/*` routes + their server actions + DB integration

## How this audit was performed

Source-only review: read `src/app/admin/(app)/**`, server actions, lib/auth helpers,
middleware, related migrations. No browser automation per user instruction.
Each page's intended UX inferred from code; bugs/gaps logged below.

---

## Architecture overview

### Auth flow
| Component | File | Role |
|---|---|---|
| PIN login UI | `app/admin/login/pin-pad.tsx` | 4-digit PIN keypad + hardware keyboard |
| Login server action | `lib/auth/admin-actions.ts` | bcrypt compare, rate-limit (5 → 10min lockout), JWT issue |
| Session lib | `lib/auth/admin-session.ts` | jose JWT signed with `SUPABASE_SERVICE_ROLE_KEY`, httpOnly cookie 24h TTL |
| Middleware | `src/middleware.ts` | Verifies cookie on every `/admin/*` request, redirects to `/admin/login` |
| Layout guard | `app/admin/(app)/layout.tsx` | Server-side `getSession()` + `redirect("/admin/login")` if missing |

### Admin shell
- File: `app/admin/(app)/_shell/admin-shell.tsx`
- Top bar (logo + page title + 🔒 logout button)
- Bottom tab nav: 4 fixed tabs (Termini, Usluge, Shop, Mušterije) + ⋯ More sheet
- More sheet: Galerija, Sajt, Statistika, Podešavanja, logout
- Mobile-first, max-width 430px (constrained in `.adm-root`)

### Pages inventory
| # | Route | Files | LoC | Server actions |
|---|---|---|---|---|
| 1 | `/admin/login` | pin-pad.tsx (152) | 152 | `unlockAdmin`, `lockAdmin` |
| 2 | `/admin/termini` | page (85), client (495), actions (113) | 693 | `updateBookingStatus`, `clearNoShowFlag`, `getMyTakenSlots`, `createWalkInBooking` |
| 3 | `/admin/termini/novi` | page (24), form (368) | 392 | (uses termini actions) |
| 4 | `/admin/usluge` | page (15), client (240+), actions (90+) | ~350 | `upsertService`, `deleteService`, `toggleServiceActive`, `reorderServices` |
| 5 | `/admin/musterije` | page (25), client (98), [id]/page (44), [id]/customer-profile (110), [id]/actions (13) | 290 | `saveCustomerNote` |
| 6 | `/admin/galerija` | client + actions | ~250 | `createGalleryImage`, `updateGalleryImage`, `deleteGalleryImage`, `reorderGalleryImages` |
| 7 | `/admin/sajt` | page (22), client (211), actions (42) | 275 | `upsertContent`, `updateSalon` |
| 8 | `/admin/shop` (subnav) | _subnav (22), page (5) | 27 | — |
| 9 | `/admin/shop/proizvodi` | page + client + actions | ~300 | `upsertProduct`, `deleteProduct`, `uploadProductImage` |
| 10 | `/admin/shop/kategorije` | client + actions | ~120 | `upsertCategory`, `deleteCategory` |
| 11 | `/admin/shop/porudzbine` | page (35), client (130), actions (10) | 175 | `updateOrderStatus` |
| 12 | `/admin/statistike` | page (199), client (222) | 421 | (read-only) |
| 13 | `/admin/podesavanja` | page (16), client (138), actions (63) | 217 | `changePin`, `upsertAnnouncement`, `deleteAnnouncement` |

**Total**: ~3,800 LoC across admin panel.

---

## Bugs found — 30 (3 HIGH, 14 MEDIUM, 13 LOW)

### 🔴 HIGH severity (3)

#### H1 — UTC vs Belgrade timezone everywhere in admin
**Affected:**
- `termini/page.tsx:7-37` — `todayStr()`, `weekRange()`, `monthRangeFromKey()`
- `termini/termini-client.tsx:255` — heatmap `todayStr` 
- `termini/termini-client.tsx:388` — DetailRow ДАТУМ uses today UTC 
- `termini/actions.ts:49` — `last_visit_date: new Date().toISOString().split("T")[0]` 
- `termini/novi/new-booking-form.tsx:18-25` — `fmtDate`, `dayKey`, `todayStr`
- `statistike/page.tsx:9-50` — `periodRange`, `previousRange`, `fmt`

**Symptom:** On Vercel (UTC server), at 02:00 Belgrade time it's still **yesterday** in UTC. So a booking made at 01:00 Wed Belgrade lands as Tue in DB, `today` shows wrong day, week range slips, heatmap shifts.

**Fix:** centralized helper that converts to Europe/Belgrade before slicing date:
```ts
function todayKey(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
  return now.toISOString().split("T")[0];
}
```
Or set `process.env.TZ = "Europe/Belgrade"` in `next.config.mjs` so all `new Date()` already returns local. Cleanest single-line fix; risk: third-party libs that assume UTC could shift. Prefer explicit helper.

#### H2 — Walk-in booking has NO slot conflict check
**File:** `termini/actions.ts:99-109` — `createWalkInBooking`

```ts
const { error } = await sb.from("bookings").insert({
  salon_id: session.salonId,
  customer_id: customerId,
  service_id: input.serviceId,
  date: input.date,
  time_slot: input.timeSlot,
  status: "confirmed",
  ...
});
```

**Symptom:** Two parallel walk-in submits at same `(date, time_slot)` both succeed → double booking.

Public booking has guard:
```ts
const { data: conflict } = await sb.from("bookings")
  .select("id").eq("salon_id", ...).eq("date", ...).eq("time_slot", ...)
  .in("status", ["pending","confirmed"]).maybeSingle();
if (conflict) return { ok: false, error: "SLOT_TAKEN" };
```

**Fix:** Mirror the public guard in `createWalkInBooking`. Even better: add UNIQUE INDEX on `(salon_id, date, time_slot) WHERE status IN ('pending','confirmed')` to enforce at DB level — eliminates race condition entirely.

#### H3 — "1. пут / 2. пут" visit count uses wrong field
**File:** `termini/termini-client.tsx:352`
```ts
const visitsCount = (customer?.no_show_count ?? 0); // approximate — we don't track total visits in customer table directly
```
Then line 411: `value={visitsCount > 0 ? \`${visitsCount + 1}. пут\` : "1. пут"}`

**Symptom:** Customer with 2 no-shows shows as "3. пут" (third visit) — but they may have never actually visited. Logic is fundamentally wrong.

**Fix:** Add a query in `termini/page.tsx` for each booking's customer's `count(*)` of `bookings WHERE status='done'` (a single aggregated query for all today's customers), pass it down. Or denormalize `total_visits` on `customers` table and increment in `updateBookingStatus(status='done')`.

---

### 🟡 MEDIUM severity (14)

#### M1 — Cyrillic-only strings in TerminiDetailSheet (LAT mode shows SR text)
**File:** `termini/termini-client.tsx`
- Line 396: `\`за ${minsUntil} min\`` — always Cyrillic, even in LAT mode
- Line 397: `"сада"`, `"у прошлости"` — Cyrillic only
- Line 398: `"обављено"`, `"no-show"`, `"отказано"` — Cyrillic only
- Line 411: `\`${visitsCount + 1}. пут\`` — Cyrillic "пут"

**Fix:** Wrap each string in `<span data-sr>` / `<span data-lat>` pairs OR thread `lang` prop down and switch.

#### M2 — Inverse leak in same sheet (SR mode shows Latin)
**File:** `termini/termini-client.tsx:444`
```ts
{booking.status === "done" ? "✓ Obavljeno" : booking.status === "no_show" ? "⚠ No-show" : "✕ Otkazano"}
```
Latin literals; in SR mode a closed-status booking shows Latin labels.

**Fix:** Same data-sr/data-lat span pattern.

#### M3 — Mixed-script typo "мушterija"
- `termini/termini-client.tsx:376` (data-sr) — "мушterija" mixes Cyrillic м/ш + Latin terija
- `termini/novi/new-booking-form.tsx:177` (data-sr) — "постојећа мушterija"
- `statistike/statistike-client.tsx:78` (data-sr) — `subSr="мушterije"` for NEW stat box

Should be **"мушterija" → "муштерија"** (full Cyrillic) and **"мушterije" → "муштерије"**.

#### M4 — Search input English placeholder
**File:** `musterije/musterije-client.tsx:43`
```tsx
placeholder="Search by phone or name…"
```
Should be SR/LAT (e.g. "Претрага по тел / имену…" / "Pretraga po tel / imenu…").

#### M5 — PostgREST `.or()` filter not escaped for special chars
**File:** `musterije/page.tsx:18`
```ts
query = query.or(`phone.ilike.%${q}%,name.ilike.%${q}%`);
```
If user types `q = "Marko, J"` → `phone.ilike.%Marko, J%,name.ilike.%Marko, J%` — comma confuses PostgREST OR-list parser. Likely returns wrong results or 400.

**Fix:** Strip `,()` from `q` before injecting, OR use the safer object-form filter, OR `.ilike("phone", \`%${escaped}%\`).or(...)`.

#### M6 — Customer profile placeholder + status labels Latin-only
**File:** `musterije/[id]/customer-profile.tsx`
- Line 78 — `placeholder="Voli kratko sa strane…"` — Latin only
- Line 80 — `"✓ SAČUVANO"` / `"SAČUVAJ BELEŠKE"` — Latin only
- Line 90 — `"Bez termina."` empty state — Latin only
- Line 65 — "poseta", line 69 — "ukupno" small caps Latin only
- Line 103 — `{b.status}` raw enum value displayed (uppercase: "DONE", "NO_SHOW") — not localized

#### M7 — MusterijeClient page subtitle Latin only
**File:** `musterije/musterije-client.tsx:37`
```tsx
<div className="adm-page-subtitle">{customers.length} ukupno</div>
```
SR mode shows Latin "ukupno". Same template at multiple admin pages.

#### M8 — SajtClient hardcoded labels + spelling typo
**File:** `sajt/sajt-client.tsx`
- Line 11 — `labelSr: "Hero · Etikecija изнад наслова"` — **typo** "Etikecija" should be "Етикета"
- Line 56 — `KONTAKT` toggle label — bilingual neutral but no SR variant text exists
- Line 111 — `"SR (ćir.)"` form label — Latin only
- Line 117 — `"LAT"` form label — language-neutral but no `<span data-sr>` wrapper

#### M9 — KontaktEditor + VremeEditor hardcoded labels
**File:** `sajt/sajt-client.tsx`
- Lines 145-152 — `NAZIV SALONA`, `ADRESA`, `TELEFON`, `EMAIL` — Latin only
- Line 192 — `"+ OPEN"` — language-neutral but Latin caps; SR equivalent missing
- VremeEditor loops `DAYS` array which has bilingual labels — those work ✓

#### M10 — PorudzbineClient hardcoded
**File:** `shop/porudzbine/porudzbine-client.tsx`
- Line 67 — `{pending} čeka · {orders.length} ukupno` — Latin only
- Line 96 — `"PORUDŽBINA"` sheet title — Latin only
- Line 119 — `"Napomena:"` banner label — Latin only
- Line 116 — `"UKUPNO"` total label — Latin only
- "(no name)" / "Nema porudžbina." — Latin only fallbacks

#### M11 — PodesavanjaClient hardcoded validation messages + form labels
**File:** `podesavanja/podesavanja-client.tsx`
- Lines 58-66 — `"PIN-ovi se ne poklapaju"`, `"PIN mora imati 4 cifre"`, `"✓ PIN promenjen"`, `"Pogrešan trenutni PIN"`, `"Greška"` — all Latin only
- Lines 73, 75, 77, 80 — `TRENUTNI PIN`, `NOVI PIN`, `PONOVI NOVI PIN`, `PROMENI PIN` — Latin only labels
- Line 89 — `+ NOVI BANNER` — Latin only
- Line 90 — `Nema banner-a.` empty state — Latin only

#### M12 — AnnouncementEditor missing time-window UI
**File:** `podesavanja/podesavanja-client.tsx:111-138`

Schema has `starts_at` / `ends_at` (timestamptz). Public site RLS includes:
```sql
AND (starts_at IS NULL OR starts_at <= NOW())
AND (ends_at IS NULL OR ends_at >= NOW())
```

But editor doesn't expose these fields. Admin can only toggle `active` boolean. So time-windowed banners (e.g. "Closed July 15-30 for vacation") are impossible without direct DB edit.

**Fix:** Add datetime-local inputs for `starts_at` and `ends_at`, both optional.

#### M13 — Statistike `priceOf` helper duplicates FK-shape unwrapping logic
**File:** `statistike/page.tsx:87-92`

Same Supabase FK array-vs-object shape mismatch we hit earlier (BUG-1 era). The local `priceOf` is OK but inconsistent with the `unwrap<T>` helper in termini-client. **Refactor:** consolidate into `lib/supabase/unwrap.ts`, import everywhere.

#### M14 — TerminiClient "DATUM" detail shows TODAY not booking.date
**File:** `termini/termini-client.tsx:388`
```tsx
<DetailRow labelSr="ДАТУМ" labelLat="DATUM" value={formatShortDate(new Date().toISOString().split("T")[0])} hint="DANAS" hintColor="success" />
```
Currently the Termini page only fetches today's bookings, so showing today is technically correct. But:
- Same component will be reused in week view (likely planned) — would be wrong.
- Hint "DANAS" hardcoded SR/LAT-neutral — would be wrong for a non-today booking.

**Fix:** When the BookingDetailSheet is generalized for week view, pass `booking.date` and dynamic hint ("DANAS" / "СУТРА" / "ПРОШЛИ ПЕТАК"). For now, low risk because today-only is enforced at fetch.

---

### 🟢 LOW severity (13)

#### L1 — `(no name)` fallback English Latin only
- `musterije/musterije-client.tsx:78` — Latin only

#### L2 — Order status `o.status` raw enum displayed in customer-profile
- `musterije/[id]/customer-profile.tsx:103` — `{b.status}` shows "done" / "no_show" / "cancelled" raw uppercase

#### L3 — `daysSince` postfix "d" not localized
- `musterije/musterije-client.tsx:86` — `${days}d` — could be `дана` / `dana` 

#### L4 — Statistike `labelsLat` prop is dead
- `statistike/page.tsx:194` passes `labelsLat={labelsLat}`
- `statistike/statistike-client.tsx:23` declares the prop, never used (component uses inline data-sr/data-lat spans instead)
- Dead code; remove.

#### L5 — Statistike retention is GLOBAL, period toggle misleading
- `statistike/page.tsx:163-179` — retention bands are computed from all customers, ignoring period
- UI period toggle suggests retention changes with period; doesn't.
- **Fix:** add explicit "RETENTION (svi kupci)" subtitle OR scope retention to period.

#### L6 — `firstVisit = customer.created_at` is wrong source-of-truth for first visit
- `termini/termini-client.tsx:351`
- Customer.created_at = DB row creation. If admin manually creates customer (walk-in entry without booking), this is wrong.
- **Fix:** either use `MIN(bookings.date) WHERE customer_id = X AND status='done'` or rename label to "ПРВА ПОСЕТА (приближно)" / "PRVA POSETA (oko)".

#### L7 — BannerEditor save button `disabled={!bodyLat}` — only validates LAT
- `podesavanja/podesavanja-client.tsx:128`
- Admin can save banner with LAT body but no SR body → SR-mode visitors see empty banner span.
- **Fix:** `disabled={!bodyLat || !bodySr}` OR allow either and copy the filled one to the empty side.

#### L8 — OrderDetail status buttons don't enforce state machine
- `shop/porudzbine/porudzbine-client.tsx:124-132`
- All 4 statuses are clickable from any state. Admin could move "picked_up" → "pending" → cancelled illogically.
- **Fix:** Disable backward transitions OR show only valid next states.

#### L9 — MusterijeClient search re-renders router on EVERY keystroke
- `musterije/musterije-client.tsx:23-27` — every `onChange` calls `router.push`
- No debounce → fast typers hammer Server Component RSC fetch.
- **Fix:** debounce 250ms OR use `transition` to keep input responsive.

#### L10 — Galerija upload has no per-file error UI surface
- File upload loop in `galerija-client.tsx:22-34`
- On error: `console.error("upload failed", f.name, err)` — silent to UI
- **Fix:** Track failed file names in state, render warning banner with retry button.

#### L11 — Sort_order conflicts when admin adds new service
- `usluge/actions.ts:27` — new services get `sort_order: 999`
- Multiple new services all get 999 → ordering becomes insertion-time dependent
- **Fix:** `MAX(sort_order)+1` query, or allow `null` and order by null-last.

#### L12 — `STATUSES` const in PorudzbineClient duplicates label translations
- Could be a single const file; duplicated in admin/booking flow files.

#### L13 — `email` from session displayed in adm-shell more sheet but not protected
- `_shell/admin-shell.tsx:103` — `<span>{session.email}</span>` shown in sheet
- Not really a security issue (admin already logged in) but exposes email in screenshots / shoulder-surfing.

---

## Functionality gaps — 13 items (planned but absent / partially built)

| # | Gap | Severity | Notes |
|---|---|---|---|
| G1 | **Loyalty UI** — schema has `loyalty_events`, `updateBookingStatus(status='done')` inserts events, BUT no admin UI to view points/redeem rewards. Public site claims "6. шишање ГРАТИС" but nothing enforces it. | HIGH | Customer profile should show "5/6 visits to free service" + "Iskoristi nagradu" button. |
| G2 | **Pickup-ready email** — when admin marks order `ready` in `/admin/shop/porudzbine`, no email goes to customer. Public order email goes to Triša only. | MEDIUM | Add Resend call in `updateOrderStatus(status='ready')` if order has customers.email. |
| G3 | **Booking-confirmed email** — public booking already sends, but admin walk-in does NOT (`createWalkInBooking` action doesn't call `sendBookingConfirmation`). | MEDIUM | Customer who's added by admin doesn't get confirmation. |
| G4 | **Pending booking moderation** — `pending` status exists in schema, but public booking writes `confirmed` directly. No admin UI to approve `pending` → `confirmed`. Status is dead code. | LOW | Either delete `pending` status code paths OR build moderation flow. |
| G5 | **Block slots / vacation UI** — `blocked_slots` table exists with `(date, time_slot, reason)` but **no admin page to manage**. Triša can't say "I'm out July 5-7". | HIGH | New admin page `/admin/blokirano` with date+slot picker + reason. Also wire `freeSlots()` in booking flow to exclude blocked. |
| G6 | **Calendar export (iCal)** — Triša has no way to subscribe her phone's calendar to her bookings. Power-user feature. | LOW | Add `/api/ical?token=<admin-token>` route generating .ics. |
| G7 | **Booking edit** — admin can mark Done/Cancelled/No-show but NOT reschedule (change date/time/service). | MEDIUM | Add edit-booking modal in detail sheet. |
| G8 | **Bulk actions in orders** — no "mark all ready" / "select multiple" workflow. | LOW | Single-day low-volume so probably not needed. |
| G9 | **Export functionality** — no CSV/PDF export of customers, bookings, revenue stats. | LOW | "Export" button on `/admin/musterije` and `/admin/statistike`. |
| G10 | **Ad-hoc surcharge UI** — `bookings.surcharge_applied` boolean exists. UI mentions "30% doplata" for no-show flagged customers but no UI to apply on a booking. | LOW | Admin should toggle surcharge per-booking with reason. |
| G11 | **Push notifications for admin** — when public booking comes in, admin doesn't get alerted (other than the email Triša gets). PWA push notifications would be useful. | LOW | Web Push API integration; requires VAPID keys + service-worker handler. |
| G12 | **Customer merge** — if same person creates two customers via different phone formats, admin can't merge. | LOW | Edge case. |
| G13 | **Soft delete** — `deleteService`, `deleteProduct`, etc. do hard DELETE. If admin deletes a service that has historical bookings, the bookings still reference the service (FK ON DELETE behavior?) — need to verify. | MEDIUM | Verify FK cascade. If RESTRICT, deletion fails silently. If CASCADE, bookings lose service info. Soft delete (active=false on services already supports this; rename "delete" to "archive"). |

---

## Database / RLS observations

- **JWT secret = `SUPABASE_SERVICE_ROLE_KEY`**. The admin session JWT is signed with the service role key. Acceptable for single-tenant deploy but if Triša's deploy ever leaks the JWT secret, the service role key is also leaked. Better: separate `ADMIN_JWT_SECRET` env var.
- **All admin actions properly use `await requireAdmin()`** + `.eq("salon_id", session.salonId)` for tenant isolation ✓
- **Public site uses regular client** + RLS for `services`, `gallery_images`, `site_content`, `site_announcements`, `product_categories`, `products` — verified via earlier migration pass.
- **Orders / bookings / customers** — admin uses service role client to bypass RLS. Public booking + order flows use service role too (`zakazivanje/actions.ts`, `shop/actions.ts`). RLS on these tables is admin-write only. **Public read on bookings is forbidden** ✓.

---

## What works well

| # | Strength |
|---|---|
| 1 | **Auth flow** — bcrypt + rate-limit + lockout + JWT cookie is solid. Logout clears cookie cleanly. |
| 2 | **Tenant isolation** — every server action `.eq("salon_id", session.salonId)`. No cross-tenant data leak. |
| 3 | **Pure server fetches with `force-dynamic`** — every admin page is `export const dynamic = "force-dynamic"`. No stale data. |
| 4 | **Booking detail sheet** — call/cancel/no-show/done flow well-modeled, customer side-effects handled (loyalty event, no_show counter). |
| 5 | **Walk-in form** — date strip + free slot grouping (jutro/popodne/veče) + auto-fill from existing customer phone is excellent UX. |
| 6 | **Statistike** — period toggle, change %, top services, retention bands, hourly bucket for "day" view — feature-complete dashboard. |
| 7 | **PIN change** — both bcrypt re-hash AND fail-counter reset on success. |
| 8 | **Drag-reorder** (Sesija 3) — works on usluge + galerija; optimistic local state. |
| 9 | **Bilingual products + featured services** (Phase A + new schema) — admin UI exposes all fields. |
| 10 | **Mobile-first admin shell** — `.adm-root` max-width 430px, bottom-tab nav fits one-handed use, sheet-style modals. |

---

## Confidence score

**Overall admin panel: 78/100**

| Category | Score | Notes |
|---|---|---|
| Auth & security | 88/100 | Solid auth; minor JWT-secret-conflated-with-service-key concern |
| Data integrity / tenant isolation | 95/100 | Clean salon_id filtering everywhere |
| Functional completeness | 70/100 | Loyalty UI gap, blocked-slots gap, edit-booking gap, pending-moderation gap |
| i18n consistency | 60/100 | 14 medium bugs of cyrillic/latin leaks across 8 files |
| TZ correctness | 55/100 | UTC vs Belgrade bug systemic, fix-once via env or helper |
| Race-condition safety | 65/100 | Walk-in slot conflict, sort_order=999 conflict |
| UX polish | 80/100 | Good empty states + transitions; minor friction in search debounce, no error UI on uploads |
| Admin↔public sync | 90/100 | After BUG-6 + BUG-7 fixes, public site reads from DB consistently |

---

## Fix prioritization & implementation plan

### Phase 1 — Critical fixes (~3 hours)
1. **H1 TZ fix** — single helper `lib/datetime.ts:todayKey()` + `weekRange()` + `monthRange()` that uses Belgrade TZ. Replace all 9 callers. (~45 min)
2. **H2 Walk-in conflict guard** — copy public booking's check into `createWalkInBooking`. Add UNIQUE INDEX migration `004_booking_slot_unique.sql`. (~30 min)
3. **H3 Visits count** — add aggregate query in `termini/page.tsx` for each booking customer's `count(bookings WHERE status='done')`, pass down to detail sheet. (~30 min)
4. **G1 Loyalty UI** — customer profile shows "Posete: X. Sledeća besplatna: Y. komada" + admin button to redeem (creates loyalty_event with type='redeem', resets counter). (~60 min)
5. **G5 Blocked slots admin UI** — new page `/admin/blokirano`, simple list + add/delete, integrate into `freeSlots()`. (~60 min)

### Phase 2 — i18n + UX cleanup (~2 hours)
6. **M1, M2, M4, M6, M7, M10, M11** — batch all hardcoded SR/LAT leaks. Create lint rule? (~75 min)
7. **M3 typo "мушterija"** — find/replace globally. (~5 min)
8. **M5 PostgREST escape** — strip `,()` in search query. (~5 min)
9. **M12 Banner time-window UI** — add datetime-local inputs in AnnouncementEditor. (~15 min)
10. **L9 search debounce** — 250ms `useDeferredValue` or manual setTimeout. (~10 min)
11. **L11 sort_order MAX+1** — query in upsertService. (~10 min)

### Phase 3 — Refactor & feature gaps (~3 hours)
12. **G2 + G3 Email automation** — Resend on order ready + walk-in confirmation. (~45 min)
13. **G4 Pending moderation OR remove** — decision by Triša. (~varies)
14. **G7 Booking edit** — extend detail sheet with reschedule modal. (~60 min)
15. **M13 Refactor `priceOf` / `unwrap`** — single util file. (~15 min)
16. **L4, L7, L8** — minor fixes batch. (~30 min)

### Phase 4 — Nice-to-have (~3 hours, ship-after)
17. **G6 iCal export**
18. **G9 CSV export**
19. **G10 Surcharge UI**
20. **G11 Push notifications** (heaviest)

**Total estimate to bring panel to ~93/100 confidence: ~8 hours of focused dev work** (Phases 1-3).

---

## Recommendation

After we go through Stefan's review of this audit, propose:
1. Tackle Phase 1 (HIGH bugs + most-impactful gaps) NEXT SESSION
2. Phase 2 batch as a "polish" commit afterwards
3. Phase 3 + 4 spread across remaining sessions before Vercel deploy
4. SEO/GEO audit can run in parallel (different surface area)
