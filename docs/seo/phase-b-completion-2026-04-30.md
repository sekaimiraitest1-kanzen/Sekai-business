---
name: SEO Phase B — completion report
description: Final state of Phase B implementation as of 2026-04-30 EOD. Lists shipped commits, deferred items, endpoint verification, and what's still owed by Stefan before launch.
type: completion-report
date: 2026-04-30
prerequisite-reads:
  - docs/seo/phase-b-pickup-2026-04-30.md
  - docs/seo/audit-2026-04-29-phase-a-1-technical.md
  - docs/seo/audit-2026-04-29-phase-a-2-platform.md
  - docs/seo/audit-2026-04-29-phase-a-3-citability.md
  - docs/seo/audit-2026-04-29-phase-a-4-llmstxt.md
---

# Trisha — SEO Phase B Completion (2026-04-30)

**Status**: Phase B implementation closed except items explicitly blocked on Stefan input. All shipped code commit-ed in 9 logical groups on `main`. Phase C (verification re-audit) deferred until prod URL exists on Vercel.

---

## 1. Commits shipped this session

In merge order (oldest → newest):

| Hash | Subject |
|---|---|
| `5e82ef3` | chore: ignore .serena MCP cache |
| `f9c6348` | docs(seo): Phase A audits + llms.txt draft + Phase B pickup |
| `876c997` | feat(seo): Phase B.1 — robots + sitemap + llms.txt route |
| `0af708a` | feat(seo): Phase B.2 — per-route metadata + viewport export |
| `ff18fa1` | feat(seo): Phase B.5a — LocalBusiness JSON-LD + tel: links + helpers |
| `53c008e` | feat(seo): Phase B.6 — H1 on /zakazivanje + alt + img dims |
| `97a527a` | feat(seo): Phase B.5b–e — Product/ItemList/Breadcrumb/Service JSON-LD |
| `1ba69bc` | feat(seo): Phase B.9 — security headers |
| `bd16bde` | feat(seo): Phase B.6b — gallery images loading=lazy |
| `4f993e4` | fix(seo): PDP title — let layout template add brand once |

All commits pass `npx tsc --noEmit` and `next build`.

---

## 2. What's now live on every PR/preview

### 2.1 Crawler & sitemap surface

- `/robots.txt` — default-allow, blocks `CCBot` + `Google-Extended` (anti-training), explicitly allows `OAI-SearchBot`/`ChatGPT-User`/`GPTBot`/`ClaudeBot`/`anthropic-ai`/`PerplexityBot`/`Perplexity-User` + `Googlebot`/`Bingbot`. Disallow `/admin/`, `/api/`, `/dev/`, `/offline`. Declares sitemap + host. Env-aware via `NEXT_PUBLIC_SITE_URL`.
- `/sitemap.xml` — home, `/zakazivanje`, `/shop` + every active product slug pulled from Supabase. Env-aware base URL.
- `/llms.txt` — `force-static`, `text/plain; charset=utf-8`. Env-aware substitution via `{{BASE}}` placeholders. Covers all 12 PDPs + service catalog + key facts + dual-script note.

### 2.2 Per-route metadata

Every public route now has a unique title, description, canonical, OG, Twitter, and robots block:

| Route | Title (after template) | Canonical |
|---|---|---|
| `/` | `Берберница Триша · Батајница` | `/` |
| `/zakazivanje` | `Заказивање термина · Берберница Триша` | `/zakazivanje` |
| `/shop` | `Продавница · Берберница Триша` | `/shop` |
| `/shop/<slug>` | `<name> — <brand> · Берберница Триша` | `/shop/<slug>` |

Root layout template: `"%s · Берберница Триша"`. `themeColor` moved from `metadata` to `viewport` export (Next 14.2 deprecation cleared).

### 2.3 Schema.org / JSON-LD coverage

| Page | Schemas |
|---|---|
| `/` | `LocalBusiness` + `HairSalon` (dual `@type` array) — NAP, areaServed, openingHoursSpecification, hasOfferCatalog, image, logo, alternateName |
| `/zakazivanje` | `Service[]` graph (one per active service, RSD price, PT-duration, areaServed, provider→`#business`) + `BreadcrumbList` |
| `/shop` | `ItemList` (positions + PDP urls) + `BreadcrumbList` |
| `/shop/<slug>` | `Product` + `Offer` (RSD, InStock/OutOfStock, InStorePickup, brand, sku=`bt-<slug>`, seller→`#business`) + `BreadcrumbList` |

`@id` cross-references hold: `LocalBusiness#business` is referenced from every Service offer's `seller` and every Product offer's `seller`, so AIO crawlers can resolve to a single business entity across pages.

### 2.4 HTML/A11y fixes

- `/zakazivanje`: visually-hidden `<h1>` ("Заказивање термина — Берберница Триша, Батајница" / Latin equivalent) above the booking nav. Page outline was H2-first → now H1 → H2.
- PDP main image: alt now includes brand (`<name> — <brand> | Berbernica Triša`); explicit `width=800 height=800` for browser space reservation.
- All three logos (`site-nav`, `site-footer`, `shop-shell`): explicit `width=120 height=120` matching `logo-120.png` intrinsic size — CLS contributor closed.
- Homepage gallery imgs: `loading="lazy"` `decoding="async"` — Next.js auto-preload was emitting 7 `<link rel="preload" as="image">` (logo + 6 gallery), now only the logo legitimately preloads. LCP candidate is `/logo-120.png`.

### 2.5 Security headers

Set in `web/next.config.mjs` via `async headers()` for all routes:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `X-DNS-Prefetch-Control: on`

HSTS is auto-applied by Vercel on production HTTPS. Verified live on localhost:3050.

---

## 3. Endpoint verification (localhost:3050, 2026-04-30)

| Endpoint | Status | Spot check |
|---|---|---|
| `/robots.txt` | 200 | All 4 rule blocks present, sitemap+host emitted |
| `/sitemap.xml` | 200 | 15 URLs (home + zakazivanje + shop + 12 PDPs), valid XML |
| `/llms.txt` | 200, `Content-Type: text/plain; charset=utf-8` | 12 PDPs listed, key facts, NAP, dual-script note |
| `/` | 200 | 2 JSON-LD blocks (LocalBusiness, plus inner OfferCatalog graph). Title clean. 1 image preload (logo only). |
| `/zakazivanje` | 200 | sr-only `<h1>` present, Service[] + BreadcrumbList JSON-LD |
| `/shop` | 200 | ItemList + BreadcrumbList JSON-LD |
| `/shop/pomada` | 200 | Product (sku=`bt-pomada`, brand=TRIŠA, RSD 900, InStock) + BreadcrumbList JSON-LD |

Security headers verified on every response.

---

## 4. Deferred items — by reason

### 4.1 Blocked on Stefan inputs (no code change possible without them)

| Item | What's needed | File hook |
|---|---|---|
| **Production domain** | `berbernica.rs` / `trisha.rs` / etc. | Vercel env `NEXT_PUBLIC_SITE_URL` — sitemap, robots, llms.txt, all JSON-LD `url`/`@id`/`siteUrl` read it |
| **Instagram URL (real)** | replace `https://instagram.com/` placeholder | `web/src/app/page.tsx` (link href) + `local-business.ts` `sameAs[]` |
| **Facebook URL** (optional) | full FB page URL | `local-business.ts` `sameAs[]` |
| **Google Business Profile public URL** | claimed GBP listing | `local-business.ts` `sameAs[]` — single biggest jump for ChatGPT entity recognition + Gemini KG |

`local-business.ts:112` has the `TODO(B.2)` marker. Once Stefan provides the URLs, drop them into a new `sameAs: [...]` array on the LocalBusiness object.

### 4.2 Deferred by policy (not blocked on inputs)

| Item | Reason | When to revisit |
|---|---|---|
| **`aggregateRating` JSON-LD** | No verifiable source — hardcoding `4.9` would be Schema.org spammy and a Google manual-action risk. `local-business.ts:113` carries the TODO. | After GBP API access OR a verified scraping pipeline |
| **B.7 i18n route-level locale** (`/sr-Cyrl/...` + `/sr-Latn/...` + hreflang) | 6–10h refactor, drastic visual change. SEO i18n strategy memo (memory) keeps Option X as target. | V1.1 — post-launch, separate session |
| **B.8 content rewrites** (citability blocks <60) | Needs SR copywriter input on hero / services / FAQ / shop intro / booking intro / testimonials block. Phase A.3 has the targets. | After copy review with Stefan |
| **B.5-FAQ** `FAQPage` JSON-LD | Prerequisite is the FAQ HTML section, which depends on B.8 copy. | Bundle with B.8 |
| **B.5-Review** schema | Prerequisite is wrapping testimonials in `<blockquote>`+`<cite>` (B.8). | Bundle with B.8 |
| **B.3 per-route OG images** (1200×630 home/booking/shop) | Needs art helper or Canva pass. PDP OG image already populated from `product.image_url`. | Pre-launch art sprint |
| **CSP** (`Content-Security-Policy`) | Needs report-only audit cycle first to inventory inline styles, Google Fonts bootstrap, Supabase Storage origin, embedded iframes. Shipping a strict CSP without that audit will break the salon. | Post-launch — start in `Content-Security-Policy-Report-Only` mode, watch reports for ≥1 week, then enforce |

### 4.3 Out of scope for this session

- **`/admin/blokirano` build issue** — was a stale `.next` cache, cleared with `rm -rf web/.next` once. Not a code bug.
- **`supabase/migrations/005_social_links.sql`** — appeared in working tree mid-session (timestamp `21:43`). Adds a `social_links` JSONB column to `salons` for admin-managed social URLs/visibility toggles. Not Phase B work; left untracked, owner to commit/discard separately.

---

## 5. Phase A baseline → expected post-Phase-B lift

(Estimates only — Phase C will measure on the prod URL.)

| Metric | Phase A baseline (2026-04-29) | Estimate after Phase B | What still pulls it down |
|---|---|---|---|
| **A.1 Technical SEO** | 47/100 | ~75–80 | i18n dual-render still in place; CSP not set |
| **A.1 Security sub-score** | 0/15 | ~10/15 | CSP missing |
| **A.2 Platform readiness avg** | 33/100 | ~55–60 | sameAs empty (waiting on Stefan); aggregateRating not set |
| **A.2 ChatGPT readiness** | mid-30s | ~55+ | Once sameAs lands, expect another +10 |
| **A.3 Citability avg** | 16.7/100 | ~16.7 (unchanged) | B.8 copy rewrite not done — citability is content-bound, not metadata-bound |
| **llms.txt** | 404 | 200 | — |

---

## 6. What Stefan must do tomorrow (2026-05-01) before deploy

1. **Provide URLs**: Instagram, FB (if exists), GBP public link. ETA: tomorrow per pickup memory.
2. **Choose production domain** + register if not already done. Supply to me when ready.
3. **B.7 i18n decision**: A (pre-release refactor, 6-10h, risky), B (post-release V1.1), C (collapse to one script, ~2h). Recommendation in pickup doc is **B**.
4. After deploy: I run Phase C — re-audit `geo-technical` + `geo-platform-analysis` on prod URL, generate `audit-2026-MM-DD-phase-c-comparison.md`.

---

## 7. Files touched this session

**Created**:
- `web/src/app/robots.ts`
- `web/src/app/sitemap.ts`
- `web/src/app/llms.txt/route.ts`
- `web/src/components/json-ld.tsx`
- `web/src/lib/phone.ts`
- `web/src/lib/seo/local-business.ts`
- `web/src/lib/seo/product.ts`
- `web/src/lib/seo/item-list.ts`
- `web/src/lib/seo/breadcrumbs.ts`
- `web/src/lib/seo/service.ts`
- `docs/seo/phase-b-completion-2026-04-30.md` (this file)

**Modified**:
- `.gitignore` (+`.serena/`)
- `web/next.config.mjs` (+ `async headers()`)
- `web/src/app/layout.tsx` (full root metadata, viewport split)
- `web/src/app/page.tsx` (LocalBusiness JSON-LD inject, tel: link, gallery `loading="lazy"`)
- `web/src/app/shop/page.tsx` (per-route metadata + ItemList/Breadcrumb JSON-LD)
- `web/src/app/shop/[slug]/page.tsx` (per-PDP OG image + Product/Breadcrumb JSON-LD + title fix)
- `web/src/app/shop/[slug]/product-detail.tsx` (richer alt + img dims)
- `web/src/app/shop/shop-shell.tsx` (logo dims)
- `web/src/app/zakazivanje/page.tsx` (per-route metadata + Service/Breadcrumb JSON-LD)
- `web/src/app/zakazivanje/booking-flow.tsx` (sr-only `<h1>`)
- `web/src/components/site-footer.tsx` (logo dims, tel: link from B.5a)
- `web/src/components/site-nav.tsx` (logo dims)

**Phase A docs committed (created prior session)**:
- `docs/seo/audit-2026-04-29-phase-a-1-technical.md`
- `docs/seo/audit-2026-04-29-phase-a-2-platform.md`
- `docs/seo/audit-2026-04-29-phase-a-3-citability.md`
- `docs/seo/audit-2026-04-29-phase-a-4-llmstxt.md`
- `docs/seo/llms.txt.draft`
- `docs/seo/phase-b-pickup-2026-04-30.md`

---

## 8. Hand-off to next session

The next session should:

1. Wait for Stefan to deliver URLs + domain (tomorrow, 2026-05-01).
2. Set `NEXT_PUBLIC_SITE_URL` on Vercel preview, smoke-test all 7 endpoints from §3 above.
3. Apply B.2b (sameAs in `local-business.ts` + IG link in `page.tsx`).
4. Deploy to production.
5. Run Phase C re-audit on prod URL; write `docs/seo/audit-2026-MM-DD-phase-c-comparison.md`.
6. Update `MEMORY.md` pickup pointer to retire `phase-b-pickup-2026-04-30.md` and point to this completion doc.
