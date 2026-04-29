# Trisha (Berbernica) — Release Readiness Plan

**Generated:** 2026-04-29 from `ship-safe audit` (score 66.1/100, C)
**Source reports:** `audit-report.md`, `scan.json`

---

## Phase A — must-fix BEFORE Vercel deploy

### A1. Replace `Math.random()` password generator (10 min)
- **Where:** `web/scripts/seed-admin.mjs:40`
- **Current:** `const tmpPassword = "TrisaAdmin-" + Math.random().toString(36).slice(2, 14) + "!"`
- **Fix:** swap to `crypto.randomBytes(12).toString("base64url")` (Node `crypto` is built-in)
- **Also:** drop the `console.log(... tmpPassword)` on line 49 — script user can recover via magic-link reset; logging the password to terminal also lands in shell history
- **Note:** ship-safe `GIT_HISTORY_SECRET` flag on `b19e0b1d04` is a false positive — only the constant prefix `"TrisaAdmin-"` was committed, the random portion never was. No rotation needed.

### A2. File-upload type validation (45 min)
8 sites, all admin-only (PIN-protected), but PIN-protected ≠ safe — once authenticated, an attacker (or compromised admin device) can upload `.html` / `.svg` with embedded JS, served from Supabase Storage public URL → stored XSS.

| File | Lines |
|---|---|
| `web/src/app/admin/(app)/galerija/actions.ts` | 18, 20 |
| `web/src/app/admin/(app)/galerija/galerija-client.tsx` | 27, 28 |
| `web/src/app/admin/(app)/shop/proizvodi/actions.ts` | 70, 73 |
| `web/src/app/admin/(app)/shop/proizvodi/proizvodi-client.tsx` | 115, 116 |

**Fix pattern (one helper, reused everywhere):**
```ts
// web/src/lib/upload-guard.ts
const ALLOWED = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp" } as const;
export function safeFilename(file: File): string {
  const ext = ALLOWED[file.type as keyof typeof ALLOWED];
  if (!ext) throw new Error(`Tip fajla nije dozvoljen: ${file.type}`);
  if (file.size > 8 * 1024 * 1024) throw new Error("Fajl > 8MB");
  return `${crypto.randomUUID()}.${ext}`;
}
```
Then replace every `file.name` with `safeFilename(file)` in upload paths.

### A3. Strip PII from production logs (15 min)
- `web/src/app/shop/actions.ts:91` — likely `console.log(orderData)` containing customer email/phone
- `web/src/app/zakazivanje/actions.ts:117` — same shape, booking data
- **Fix:** remove or replace with structured log of just `{ orderId, customerId }` (no email/phone/name in plaintext)

---

## Phase B — Trisha-specific gaps NOT caught by ship-safe

### B1. RLS audit (30 min — verify, then patch any gaps)
Run against live Supabase project `ljxovmahbyxgyyttvldv`:
```sql
SELECT schemaname, tablename, rowsecurity FROM pg_tables
 WHERE schemaname = 'public' ORDER BY tablename;
SELECT schemaname, tablename, policyname, cmd FROM pg_policies
 WHERE schemaname = 'public' ORDER BY tablename;
```
**Tables that MUST have policies (not just RLS enabled):**
`bookings`, `customers`, `products`, `orders`, `gallery_images`, `site_announcements`, `loyalty_events`, `services`, `working_hours`, `salons`, `admin_users`, `product_categories`, `blocked_slots`

Public site reads: `services`, `working_hours`, `salons`, `gallery_images`, `products` (active only), `site_announcements` (active window).
Public site writes: `customers` (upsert), `bookings` (insert), `orders` (insert).
Admin: full access via service-role on server actions.

### B2. PIN strength for production (10 min)
Currently 4-digit PIN `1234`. Triša mora promeniti pre deploy-a. Razmotri:
- 6 cifara umesto 4 (10x veći prostor, 1M kombinacija)
- ili: 4 cifre + obavezna rotacija na 90 dana (lakše za korisnika)
- Trenutni rate limit (5 pokušaja → 10min lockout) je dovoljan za 4 cifre uz pretpostavku da napadač ne dobije bcrypt hash

### B3. Resend production domain (DEPENDS ON TRIŠA)
- Trenutno: `RESEND_FROM_EMAIL=onboarding@resend.dev` (deli sa svim Resend free-tier korisnicima)
- Pre deploy: Triša mora kupiti `berbernica.rs`, dodati u Resend, postaviti SPF + DKIM DNS recorde
- Nakon verifikacije: `RESEND_FROM_EMAIL=noreply@berbernica.rs`

### B4. Vercel security headers (15 min, na deploy day)
Dodaj u `next.config.mjs` ili `vercel.json`:
```js
{ "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
{ "key": "X-Frame-Options", "value": "DENY" }
{ "key": "X-Content-Type-Options", "value": "nosniff" }
{ "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
{ "key": "Content-Security-Policy", "value": "default-src 'self'; img-src 'self' https://*.supabase.co data:; ..." }
```
CSP treba whitelista za Supabase Storage URL i Resend ako šalje sa client-a.

---

## Phase C — deploy-day infra checklist

1. Rotacija svih ključeva pri prebacivanju na Trišin Supabase + Vercel/Resend account
2. Vercel env vars setup (lista u `project_trisha_pending_tasks.md`)
3. Supabase Auth rate-limit (Settings → Auth → Rate Limits)
4. Supabase PITR ako je na Pro planu (default daily backup za free tier)
5. Lighthouse audit na production URL-u (cilj: 90+ na sve 4 ose)
6. PWA install test na iOS Safari + Android Chrome (kritično za barbershop use-case)
7. End-to-end booking + order test sa pravog telefona

---

## False positives (ne diraj)

- **GIT_HISTORY_SECRET** na `b19e0b1d04` i `557c7089ac` — samo string konstanta `"TrisaAdmin-"`, nema realne tajne
- **PII_EMAIL_HARDCODED** za `berbernicatrisa@gmail.com` — to je javni biznis email, nije PII (ALI: po memoriji vrednost je već u DB; hardcoded mesta su stale i mogu se očistiti zarad clean koda, nije security)
- **API_NO_RATE_LIMIT** na `web/src/lib/supabase/server.ts:0` — Supabase ima edge rate limit, plus PIN-flow ima rate limit u migraciji 001
- **RAG_SYSTEM_DOCS_WITH_USER_DOCS** u seed-admin.mjs — pattern-match, nema RAG sistema u projektu
- **Password Assignment** na `seed-admin.mjs:40` — to je `tmpPassword` lokalna var u dev seed scriptu, ne hardcoded credential

## Total effort estimate

- Phase A: ~70 min (jedan focused dev session)
- Phase B1-B2: ~40 min (mogu paralelno sa Phase A)
- Phase B3: čeka Trišu (domain + DNS)
- Phase B4 + Phase C: deploy day

**Recommendation:** Phase A pre nego što završiš preostale 4 sesije (service worker, banner, drag-reorder, PWA polish) — ne želiš da gradiš PWA polish nad ranjivim upload paths.
