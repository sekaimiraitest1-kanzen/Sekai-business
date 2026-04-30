# Phase A.1 — Technical SEO Audit

| Field | Value |
|---|---|
| Date | 2026-04-29 |
| Phase | A.1 — Technical SEO Audit (workflow §5 step 1) |
| Target | `http://localhost:3050/` (Next.js 14 dev mode, App Router, SSR expected) |
| Auditor | geo-technical agent |
| Reference | `docs/seo-geo-skills-research.md` §5 + `docs/seo/llm-crawler-handling-reference.md` |
| Routes audited | `/`, `/zakazivanje`, `/shop`, `/shop/pomada-batajnica` (PDP sample) |
| Method | `curl` for headers + body, Python regex for HTML parsing. WebFetch skipped (unreliable on localhost). |
| HTTPS deduction | Deferred — localhost dev server runs HTTP. Will retest at staging/prod URL. |

---

## Technical Foundations

**Technical Score: 47 / 100  —  Poor**

The site has a strong, healthy SSR backbone (the single most important GEO factor) and clean URLs, but the entire indexability and discovery layer is essentially absent: no robots.txt, no sitemap, no canonical, no Open Graph, no Twitter Card, no JSON-LD, no security headers, and no hreflang for the dual-script Cyrillic/Latin content. The PDP route does generate dynamic per-page titles and descriptions, but every other public route inherits the same generic site-wide title and meta description from the root layout — meaning Google and AI crawlers cannot tell the homepage, booking page, and shop list apart by their `<title>` or `<meta description>`.

### Score Breakdown

| Category | Score | Weight | Weighted | Status |
|---|---|---|---|---|
| Server-Side Rendering | 95/100 | 25% | 23.75 | Excellent |
| Meta Tags & Indexability | 30/100 | 15% | 4.50 | Critical |
| Crawlability (robots/sitemap) | 0/100 | 15% | 0.00 | Critical |
| Security Headers | 25/100 | 10% | 2.50 | Poor (HTTPS deferred) |
| Core Web Vitals Risk | 55/100 | 10% | 5.50 | Fair |
| Mobile Optimization | 90/100 | 10% | 9.00 | Excellent |
| URL Structure | 90/100 | 5% | 4.50 | Excellent |
| Response & Status | 70/100 | 5% | 3.50 | Good (dev cache headers fine) |
| Additional Checks | 30/100 | 5% | 1.50 | Poor (no JSON-LD, no hreflang) |
| **Total** | | | **~47** | **Poor** |

---

## Step 1 — Response Headers & Status

All four audited public routes return `200 OK` with `Content-Type: text/html; charset=utf-8`, served by Next.js dev server (`X-Powered-By: Next.js`).

| Header | Value | Note |
|---|---|---|
| `Cache-Control` | `no-store, must-revalidate` | Expected in dev mode. Should be revisited at prod (RSC pages need `private, no-store`; static assets need long max-age + immutable). |
| `Vary` | `RSC, Next-Router-State-Tree, Next-Router-Prefetch, Accept-Encoding` | Correct for App Router RSC negotiation. |
| `Content-Encoding` | (absent) | Dev server is not compressing. Verify gzip/br on prod. |
| `ETag` | (absent on HTML, present on `manifest.json` + `sw.js`) | Acceptable — HTML is dynamic. |
| `X-Robots-Tag` | (absent) | Default = indexable. Confirm prod does not accidentally inject `noindex` (Vercel preview deployments do this — make sure prod is `production` env). |
| `X-Powered-By: Next.js` | present | Minor info-disclosure. Optional removal in `next.config` for prod. |

No redirect chains observed on any of the four routes.

---

## Step 2 — Robots.txt and XML Sitemap

| Resource | Status | Finding |
|---|---|---|
| `/robots.txt` | **404 NOT FOUND** | CRITICAL. Every crawler — Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot — receives 404. They will fall back to default-allow but the site loses the ability to (a) declare a sitemap location, (b) enforce a deliberate AI bot policy, (c) block training-only bots like CCBot or Google-Extended. |
| `/sitemap.xml` | **404 NOT FOUND** | CRITICAL. No XML sitemap means search engines must rely on link discovery only, and there is no `<lastmod>` signal for re-crawl prioritization. With ~12 PDP routes + 3 hub routes already in the codebase, a sitemap would have ~15+ URLs. |
| `/llms.txt` | **404 NOT FOUND** | MEDIUM. Optional but increasingly recommended for AI crawler context discovery. Not a hard SEO blocker. |

There are also no Next.js metadata handlers registered: no `app/robots.ts`, no `app/sitemap.ts`. These are the idiomatic Next 14 App Router primitives — Phase B should add both.

**Crawlability Score: 0/100** (both required artifacts absent).

---

## Step 3 — Meta Tags Audit

The root layout (`src/app/layout.tsx` line 48) declares static metadata that bleeds across every page that does not override it. Only the PDP route (`/shop/[slug]`) emits dynamic per-product `<title>` and `<meta description>` — confirmed in the raw HTML of `/shop/pomada-batajnica`.

| Tag | Homepage `/` | `/zakazivanje` | `/shop` | `/shop/pomada-batajnica` | Verdict |
|---|---|---|---|---|---|
| `<title>` | Берберница Триша · Батајница | Берберница Триша · Батајница (same!) | Берберница Триша · Батајница (same!) | Pomada "Batajnica" — TRIŠA · Berbernica Triša | 3 of 4 routes share identical title — duplicate-content signal. |
| `<meta description>` | Твоје место за стил, традицију и добру причу. | (same!) | (same!) | Kupi Pomada "Batajnica" u Berbernici Triša. | 3 of 4 routes share identical description. |
| `<link rel="canonical">` | MISSING | MISSING | MISSING | MISSING | Critical. Every page is canonical-less. |
| `<meta name="robots">` | MISSING | MISSING | MISSING | MISSING | Default = index, follow. Acceptable but explicit is better. |
| `<meta name="viewport">` | `width=device-width, initial-scale=1` | (same) | (same) | (same) | Good. |
| `<html lang>` | `sr-Cyrl` | `sr-Cyrl` | `sr-Cyrl` | `sr-Cyrl` | Set from cookie (`src/app/layout.tsx:80-84`); flips to `sr-Latn` if user toggles. AI crawlers without cookies always see `sr-Cyrl`. See Step 9 for the deeper i18n problem. |
| Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) | MISSING | MISSING | MISSING | MISSING | No social/AI preview metadata anywhere on the site. |
| Twitter Card (`twitter:card`, etc.) | MISSING | MISSING | MISSING | MISSING | Same. |
| `<link rel="alternate" hreflang="...">` | MISSING | MISSING | MISSING | MISSING | Critical for dual-script site (see Step 9). |
| `<link rel="manifest">` | `/manifest.json` | (same) | (same) | (same) | Good. |
| Favicons + icons | All present | (same) | (same) | (same) | Good. |
| `metadataBase` | `process.env.NEXT_PUBLIC_SITE_URL ?? http://localhost:3050` | — | — | — | Defined in root layout. Will work once env var is set in prod. |

**Meta Tags & Indexability Score: 30/100.** Title and description are present on every page but only meaningfully varied on the PDP. Canonical, OG, Twitter, and hreflang are missing site-wide.

---

## Step 4 — Security Headers

HTTPS check is deferred (localhost dev mode). All other headers were inspected from the actual HTTP response and are listed below.

| Header | Status | Value | Risk if Missing |
|---|---|---|---|
| HTTPS | (deferred) | dev = HTTP | Re-test at staging/prod. |
| `Strict-Transport-Security` | MISSING | — | Will need to be set at the edge (Vercel/host) in prod. |
| `Content-Security-Policy` | MISSING | — | XSS exposure; also a known Lighthouse audit fail. |
| `X-Frame-Options` | MISSING | — | Clickjacking risk. Recommend `SAMEORIGIN`. |
| `X-Content-Type-Options` | MISSING | — | MIME-sniffing risk. Recommend `nosniff`. |
| `Referrer-Policy` | MISSING | — | Recommend `strict-origin-when-cross-origin`. |
| `Permissions-Policy` | MISSING | — | Recommend a restrictive default. |

These are framework-set headers that Next.js does not provide by default. They survive to prod and need to be configured either in `next.config.mjs` (`async headers()`) or at the host edge. Excluding HTTPS, total deduction = -38 points → **Security Score 25/100**.

---

## Step 5 — URL Structure

Audited URLs:

- `/` — homepage, root.
- `/zakazivanje` — booking, single segment, descriptive Serbian Latin slug.
- `/shop` — single segment, English-but-universal.
- `/shop/pomada-batajnica` — `/category/slug` two-level hierarchy, hyphenated, lowercase, fully readable.

All URLs are clean: lowercase, hyphen-separated, no query strings, no session IDs, no UUIDs, no excessive nesting. Slugs are descriptive in transliterated Serbian Latin (e.g., `pomada-batajnica`, `ulje-za-bradu`, `after-shave-balzam`). Hierarchy is sensible.

**Minor concern:** the booking and shop slugs are in `sr-Latn` (Latin Serbian) only; there is no Cyrillic-URL variant. This is the right pragmatic choice — URLs in Cyrillic are punycode-encoded in browser address bars and look ugly in shares. But it does mean the URL itself is monolingual even though the page content is bilingual. Not a deduction.

**URL Structure Score: 90/100.**

---

## Step 6 — Mobile Optimization

| Signal | Found | Note |
|---|---|---|
| `<meta name="viewport">` | yes, correct | `width=device-width, initial-scale=1` |
| `<meta name="format-detection" content="telephone=no, address=no, email=no">` | yes | Prevents iOS auto-link of phone/address — intentional, correct on a barbershop page that has its own clickable phone CTAs. |
| `<meta name="apple-mobile-web-app-capable">` | yes | PWA-friendly. |
| `<meta name="mobile-web-app-capable">` | yes | Cross-vendor counterpart. |
| Manifest linked | yes (`/manifest.json`) | Fully populated (name, short_name, icons, theme/background colors, scope, lang). |
| Service worker | yes (`/sw.js`) | Registered via `<ServiceWorkerRegister />` in root layout. |

The static analysis does not let us measure tap-target sizing, but viewport + manifest + SW registration are all the right ingredients. **Mobile Score: 90/100.**

---

## Step 7 — Core Web Vitals (Static-Risk Estimation)

This is HTML-source heuristic only — actual field data requires PageSpeed Insights / CrUX once the site is on a public URL.

| Vital | Risk | Indicators Found |
|---|---|---|
| LCP | **Medium** | Homepage preloads 9 woff2 fonts and 6 hero images (`/legacy/uploads/IMG_*.jpeg`) via `<link rel="preload" as="image">`. Preloading 6 images is aggressive — only the actual LCP image needs `fetchpriority="high"`. The rest should be lazy. No `<img>` on the homepage carries explicit `width` and `height` attributes (8 of 8 images audited) — that adds CLS risk too. |
| INP | **Low–Medium** | Next.js 14 App Router with RSC; webpack chunk linked with `fetchPriority="low"` (good). No synchronous third-party scripts visible in the head. Body has dual-script duplication which inflates DOM size — every label appears twice (Cyrillic + Latin) with one half hidden via class — see Step 9. |
| CLS | **Medium–High** | All 8 homepage images, the 1 PDP image, and the 1 shop image lack explicit `width` + `height` attributes. Web fonts use `display: swap` (good — observed in `JetBrains_Mono`/`next/font` config), so font swap should not cause large reflows, but image-driven CLS is the real risk here. Hero gallery on `/` is the largest single contributor. |

**Core Web Vitals Risk Score: 55/100.** Validate with PageSpeed Insights once a non-localhost URL exists.

---

## Step 8 — Server-Side Rendering / JavaScript Dependency (CRITICAL CHECK)

**Status: LOW risk.**
**Rendering type: SSR (Next.js 14 App Router with React Server Components).**
**Framework signals: `self.__next_f` RSC payload present in HTML on every route. No `__NEXT_DATA__` (Pages Router signal — absent, as expected).**

Body content sizes from raw HTML (no JS executed):

| Route | HTML body bytes | Visible text bytes (after stripping tags/scripts/styles) | Visible H1/H2 |
|---|---|---|---|
| `/` | 68,754 | 5,464 | H1=1, H2=6 |
| `/zakazivanje` | 17,532 | 839 | H2=2 (no H1 — see note) |
| `/shop` | 23,817 | 1,235 | H1=2 (one Cyrillic, one Latin) |
| `/shop/pomada-batajnica` | 19,522 | 772 | H1=2 (Cyrillic + Latin) |

Sample of homepage visible text from raw HTML:

> Берберница Triша · Батајница · EST 2025 … Берберница Триша — традиционална мушка берберница у Батајници. Шишање, брада, добра прича … 900 РСД ОД … 4.9★ Google …

This is exactly what we want for AI crawlers. Business name, tagline, value prop, services preview, price, and rating are all present in the initial HTML before any JS runs. ClaudeBot, GPTBot, PerplexityBot, OAI-SearchBot will all be able to read the homepage at full fidelity.

**Note on `/zakazivanje`:** Booking page has no `<h1>` — only `<h2>` for "Изабери услугу. / Izaberi uslugu." (Step 1 of the wizard). This is a content-quality issue rather than an SSR issue. The page IS server-rendered; it just lacks a top-level H1.

**SSR Score: 95/100.** The 5-point deduction is for the missing H1 on `/zakazivanje` and for the pattern of dual-script body content (Step 9), not for any SSR failure.

---

## Step 9 — Additional Technical Checks

### 9.1 Dual-script i18n gap (HIGH severity)

The site renders **both Cyrillic and Latin Serbian simultaneously** in the same HTML, with one variant hidden via CSS class based on the `data-lang` attribute on `<html>`. Confirmed by inspecting raw HTML:

> `<h1>Место где се рез претвара у причу</h1>` *and* `<h1>Mesto gde se rez pretvara u priču</h1>` are both present in the homepage body — back-to-back.

This has three real consequences:

1. **Duplicate content for AI crawlers.** ClaudeBot/GPTBot see both scripts in the HTML and cannot tell the user actually only sees one at a time. Citations may quote either form unpredictably.
2. **No hreflang anywhere on the site.** With no `<link rel="alternate" hreflang="sr-Cyrl">` / `hreflang="sr-Latn">` and no route-level locale (`/sr-Cyrl/...` / `/sr-Latn/...`), Google has no way to know there are two equivalent variants. The cookie-driven `<html lang>` switch is invisible to crawlers (which carry no cookies on first crawl, so they always see `sr-Cyrl`).
3. **DOM bloat.** Every label, heading, and paragraph is duplicated — roughly 2× the visible text token count. This inflates HTML payload by ~10–15 KB on the homepage and adds CLS/LCP risk.

The fix is structural and belongs to **Phase B step 4 (Internationalization)**. Two viable patterns:

- **(A) Single canonical script + transliteration toggle as visual-only:** keep `sr-Cyrl` as the canonical script, render Cyrillic in HTML, transliterate to Latin client-side. Pros: simple, one canonical URL per page. Cons: AI crawlers without JS see only Cyrillic.
- **(B) Route-level locale with hreflang:** introduce `/sr-Cyrl/...` and `/sr-Latn/...` route segments with proper `<link rel="alternate" hreflang>` cross-references. Pros: cleanest SEO, both variants discoverable. Cons: site refactor, doubles sitemap, requires careful canonical strategy.

Recommend **(B)** for a Serbian-market local business where Latin search is genuinely common.

### 9.2 JSON-LD structured data (MEDIUM severity)

`<script type="application/ld+json">` blocks: **0** on every audited route. This is the single biggest miss for local-business GEO — `LocalBusiness` JSON-LD is what gets a barbershop into Google's local pack and into Perplexity's "barbers in Batajnica" answer card.

What is missing, by route:

- **`/`** — `LocalBusiness` (NAP, geo, openingHours, priceRange, sameAs to social), `Organization`, optionally `FAQPage` if there is an FAQ section.
- **`/zakazivanje`** — `Service` schema for each barbershop service (name, price, duration), or wrap each in `OfferCatalog`. Optionally `ReservationAction` linkage.
- **`/shop`** — `ItemList` of products.
- **`/shop/[slug]`** — `Product` + `Offer` per PDP (name, price RSD, availability, image, brand, sku).
- Across all pages — `BreadcrumbList`.

This is the meat of **Phase B step 5 (JSON-LD structured data)**.

Note: `self.__next_f` is the Next.js RSC streaming payload, NOT structured data. Do not confuse the two.

### 9.3 Service worker SEO interaction (LOW severity, design is correct)

Inspected `/sw.js` (3.3 KB, hand-rolled, no Workbox). The strategy is:

- Static assets → cache-first (correct, no SEO impact).
- Public navigations (`/`, `/shop`, `/zakazivanje`) → **network-first**, cache fallback, `/offline` last resort.
- `/admin/*` and `/api/*` → network-only.
- Cross-origin → pass-through.

**Network-first for navigations is the correct choice for SEO.** Crawlers will not be served stale `<head>` because the SW always tries the live network first. The only edge case is when the network is down — but crawlers will not see that path. No deduction.

One nit: the SW does cache successful navigation responses in `RUNTIME_CACHE`. If a returning user visits while offline they get the previous page snapshot, which could include outdated meta tags or stale prices. Acceptable for a barbershop site; document it.

### 9.4 robots.txt AI bot policy (HIGH severity, blocks Phase A handoff to Phase B)

Per `docs/seo/llm-crawler-handling-reference.md` the recommended Berbernica policy is **default-open with selective blocks**:

- ALLOW: `GPTBot`, `ClaudeBot`, `Claude-Web`, `PerplexityBot`, `OAI-SearchBot`, `Applebot`, `Applebot-Extended`, `Bingbot`, `Googlebot`, `Google-Extended` (citation-tier — opt-in to AI search visibility).
- BLOCK: `CCBot` (Common Crawl, training-set ingestion with no citation), and consider blocking `Google-Extended` if the brand wants to opt out of Google Bard/Gemini training.
- DECLARE: `Sitemap: https://<prod-domain>/sitemap.xml`.

Phase B step 1 generates this file. Do not generate it now; this audit only flags the gap.

### 9.5 Alt-text gap (MEDIUM severity)

The PDP product image lacks an `alt` attribute (1 of 1). Homepage and shop list images all carry alt attributes (verified). Image dimensions (`width` + `height`) are missing on every image on every page, which is a CLS contributor (Step 7).

---

## Priority Actions (severity-ordered)

1. **[CRITICAL] Add `app/robots.ts`** — Next.js App Router metadata route that emits the AI-bot policy from `docs/seo/llm-crawler-handling-reference.md`. Default-allow with `CCBot` blocked. Declare sitemap URL. → **Fixed in Phase B step 1.**

2. **[CRITICAL] Add `app/sitemap.ts`** — generate XML sitemap dynamically: include `/`, `/zakazivanje`, `/shop`, and one entry per active product (read from Supabase `proizvodi` table). Set `lastmod` from the row's `updated_at`. → **Fixed in Phase B step 1.**

3. **[CRITICAL] Per-route `generateMetadata`** — every public page currently inherits the root layout's static metadata. Add a `generateMetadata` export to `src/app/page.tsx` (homepage), `src/app/zakazivanje/page.tsx`, and `src/app/shop/page.tsx` so each gets a unique `<title>`, `<meta description>`, `<link rel="canonical">`, full Open Graph block (`og:title`, `og:description`, `og:image`, `og:url`, `og:type=website` or `business.business`), and Twitter Card. The PDP route (`src/app/shop/[slug]/page.tsx`) already does this for title+description but is missing canonical, OG, and Twitter. → **Fixed in Phase B step 2 (meta tags) and step 3 (canonical/OG/Twitter).**

4. **[CRITICAL] LocalBusiness + Product JSON-LD** — homepage gets `LocalBusiness` (NAP, geo coords, openingHours, priceRange "$$", sameAs Instagram/Google), each PDP gets `Product` + `Offer`, breadcrumbs everywhere. → **Fixed in Phase B step 5.**

5. **[HIGH] Decide and implement i18n strategy for sr-Cyrl ↔ sr-Latn** — current dual-rendering inflates DOM and gives crawlers duplicate content with zero hreflang. Recommend route-level locale (`/sr-Cyrl/...` + `/sr-Latn/...`) with proper hreflang link tags, OR collapse to single canonical script (sr-Cyrl) with client-side transliteration toggle for visual preference only. → **Fixed in Phase B step 4.**

6. **[HIGH] Security headers via `next.config.mjs` `headers()`** — set `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. HSTS is set by host (Vercel) on prod HTTPS. → **Fixed in Phase B step 7 (or whichever step covers headers — check workflow §5).**

7. **[HIGH] Add explicit `width` and `height` to every `<img>`** — all 10+ audited images lack dimensions. This is the dominant CLS contributor. Switching from `<img>` to Next.js `<Image>` (with `unoptimized: true` already set) would solve this in one pass. → **Fixed in Phase B (Core Web Vitals pass).**

8. **[HIGH] Add an H1 to `/zakazivanje`** — the booking page has no `<h1>`. "Закажи термин / Zakaži termin" or similar should wrap as the page-level H1. → **Trivial fix, can be in Phase B step 2 (meta + headings).**

9. **[MEDIUM] Add alt text to PDP product images** — `/shop/[slug]` product image has no alt. Use product name in both scripts, or canonical name. → **Phase B step 2.**

10. **[MEDIUM] Trim homepage image preloads** — preloading 6 hero images is excessive. Keep `fetchPriority="high"` on the actual LCP image only; lazy-load the rest. → **Phase B Core Web Vitals pass.**

11. **[LOW] Optional `/llms.txt`** — provides AI crawlers a curated content index. Not a hard requirement but cheap. → **Phase B step 1 alongside robots/sitemap.**

12. **[LOW] Re-run security-header audit on prod URL** — once deployed, re-test HTTPS, HSTS, and any host-level headers Vercel adds. → **Phase A.4 (re-audit after fix).**

---

## Handoff Notes for Phase A.2 (geo-platform-analysis)

Nothing in this audit blocks Phase A.2. The site is fully crawlable by AI bots TODAY (SSR is working, content is in the HTML, no `noindex`, no robots blocks because there is no robots.txt). The blocker for *visibility in AI answer engines* is the lack of LocalBusiness/Product JSON-LD and the duplicate-content noise from dual-script rendering — but those are content-quality issues, not crawl-access issues. Phase A.2 can proceed with the current site state.
