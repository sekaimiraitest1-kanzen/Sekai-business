# Phase A.2 — GEO Platform Readiness

| Field | Value |
|---|---|
| Date | 2026-04-29 |
| Phase | A.2 — GEO Platform Readiness (workflow §5 step 2) |
| Target | `http://localhost:3050/` (Berbernica / "Triša" barbershop, Batajnica, Belgrade) |
| Auditor | geo-platform-analysis agent |
| Reference | `docs/seo-geo-skills-research.md` §5; grounded on `docs/seo/audit-2026-04-29-phase-a-1-technical.md` |
| Method | Reused Phase A.1 raw-HTML analysis; precise Python regex parse of homepage; WebFetch for Wikipedia, Reddit (via DuckDuckGo HTML fallback), Google Maps, Wikidata. |
| Query class scored against | `najbolja berbernica u Beogradu`, `berbernica u Batajnici / Zemunu`, `frizer Beograd`, `barbershop Belgrade`, `barbershop near me` (local-business / "near me" intent). NOT generic content queries. |
| Key new signals over Phase A.1 | (1) Real NAP is in HTML: `Majora Zorana Radosavljevića 226b, Batajnica` + phone `065 9003 742` + a `maps.google.com/?q=...` link. (2) Phone is **not** wired as `tel:` (zero `tel:` hrefs). (3) Instagram link is a **placeholder** (`https://instagram.com/` with no handle). (4) Six on-page Google review excerpts visible (`★★★★★`, dated "1 mes." / "1 мес."), labelled `4.9 ★ GOOGLE OCENA`. (5) No Facebook, no LinkedIn, no YouTube, no GitHub anywhere on the homepage. |

---

## Platform Readiness Analysis

**Platform Readiness Average: 33 / 100**

### Platform Scores Overview

| Platform | Score | Status |
|---|---|---|
| Google AI Overviews | 38 / 100 | Poor |
| ChatGPT Web Search | 28 / 100 | Critical |
| Perplexity AI | 31 / 100 | Poor |
| Google Gemini | 47 / 100 | Fair |
| Bing Copilot | 22 / 100 | Critical |

**Strongest Platform:** **Google Gemini (47/100)** — the only platform on which the site has a real, verifiable upstream signal: a Google Business Profile (the site itself surfaces "4.9 ★ Google ocena" plus six dated Google review excerpts). For local-pack queries Gemini draws heavily from GBP, and the site is at least eligible there. Without LocalBusiness JSON-LD or sitemap it cannot reach Excellent, but it has a foothold the other platforms simply do not have.

**Weakest Platform:** **Bing Copilot (22/100)** — Bing-specific signals are essentially zero across the board: no `/sitemap.xml` for IndexNow, no `msvalidate.01` Bing Webmaster verification, no LinkedIn presence, no GitHub, no Microsoft-ecosystem footprint at all, and no structured data Bing's index can use. For a Belgrade local-services business this is the single least-reachable AI platform — Bing's market share in Serbia is small and Microsoft/Copilot has no anchor signal to pull on.

---

### Google AI Overviews

**Score: 38 / 100** — Poor

| Signal Category | Score | Key Findings |
|---|---|---|
| Content Structure | 18 / 40 | H1 present on homepage ("Mesto gde se rez pretvara u priču" / Cyrillic counterpart), 6 H2s, 0 H3s. Headings are **statements**, not question-form ("Šta radimo." vs. "Kako se zakazuje termin?"). No question-anchored answer-target pattern. No definition pattern ("Berbernica Triša je..." in a quotable lead paragraph). One implicit comparison row exists (services + prices), but it is rendered as cards, not a `<table>` AIO can extract directly. No FAQ block. The price-list text ("900 РСД ОД") is in HTML and quotable, which is the one solid AIO win. |
| Source Authority | 8 / 30 | Site is local and unindexed — almost certainly does not rank top-10 for any of the target queries today (no sitemap, three of four routes share the same title). No outbound citations to authoritative sources. Six on-page Google review snippets are good social proof but AIO does not cite the page-level reproductions; it cites the GBP itself. The page is **not yet** a primary source for any query. |
| Technical Signals | 12 / 30 | Clean heading hierarchy (no skipped levels), proper semantic HTML (Phase A.1 confirmed SSR 95/100). **Zero JSON-LD** (no Article, no FAQPage, no LocalBusiness, no HowTo). No Open Graph, no Twitter Card. No canonical. Manifest + viewport + apple-mobile meta are clean. Service worker is network-first (won't poison crawler cache). Page is ~76 KB HTML — fine. The dual-script Cyrillic+Latin duplication adds noise AIO has to dedupe. |

**Optimization Actions:**
1. **Add a "Često postavljana pitanja / Често постављана питања" section to the homepage** with 4–6 question-anchored entries: *"Gde se nalazi Berbernica Triša?"* / *"Koliko košta šišanje u Triši?"* / *"Da li je potrebno zakazivanje?"* / *"Koje je radno vreme?"* / *"Da li radite samo muška šišanja ili i bradu?"* — answer each in 40–60 words directly under the question. This is the canonical AIO "answer target" pattern.
2. **Render the services + prices as a real `<table>`** (or expose a structured `<dl>` parallel to the visual cards) with columns *Usluga · Trajanje · Cena (RSD)*. AIO extracts comparison tables directly into Overview answers; cards do not.
3. **Add `FAQPage` JSON-LD** (Phase B step 5) wrapping the FAQ from action 1, plus `LocalBusiness` so AIO can ground the entity behind any answer. Without this the FAQ is plain HTML and AIO has to guess the entity from page context.

---

### ChatGPT Web Search

**Score: 28 / 100** — Critical

| Signal Category | Score | Key Findings |
|---|---|---|
| Entity Recognition | 4 / 35 | **No Wikipedia article** for "Berbernica Triša" / "Берберница Триша" / "Trisha barbershop Belgrade" (verified via Wikipedia search). **No Wikidata entity** (search returned no match; rate-limited but consistent with the Wikipedia absence). **No `Organization` or `LocalBusiness` JSON-LD** on the site, therefore no `sameAs` array linking to Instagram/Google/Wikipedia. There is no third-party authoritative source confirming the entity beyond the (excellent) Google reviews. ChatGPT's entity recognizer has nothing structured to anchor "Berbernica Triša" to. The 4 points are credit for a consistent brand name appearing in the visible HTML and in the `<meta name="application-name" content="Триша">`. |
| Content Preferences | 16 / 40 | Factual, concise statements are present (price, address, neighborhood "Batajnica, Zemun", service list). The six on-page review excerpts include direct, quotable testimonials in natural Serbian. **Critical gaps:** no author byline / expert attribution (the barber's name as a Person entity is not surfaced), no publication date or modified date anywhere in HTML (zero `YYYY-MM-DD` strings in the body), no statistical claims with sources beyond the self-asserted "4.9 ★". Every "who/what/when/where/why/how" can be answered from the HTML except *when* (no opening date / opening hours table is structured — text only). |
| Crawler Access | 8 / 25 | `/robots.txt` is **404**. Per RFC, default is allow-all, so OAI-SearchBot, ChatGPT-User, and GPTBot are technically all permitted — but the score is *not* full-marks because there is **no explicit allow-list**, no Sitemap declaration to give the crawler a discovery vector, and the dev environment served `Cache-Control: no-store, must-revalidate` which is fine. The 8 points reflect "default-allow + nothing actively blocking" minus "nothing actively helping". This will jump to ~22/25 the moment Phase B step 1 ships robots.txt + sitemap.xml. |

**Optimization Actions:**
1. **Ship `Organization` + `LocalBusiness` JSON-LD with a `sameAs` array** linking to the (eventual) Instagram URL, the Google Business Profile URL, and the Google Maps place URL. Even without Wikipedia, a well-formed `sameAs` graph is the strongest entity signal a small local business can give ChatGPT — it lets the entity recognizer cross-reference the brand across the open web. (Phase B step 5.)
2. **Fix the placeholder Instagram link** — `<a href="https://instagram.com/">` currently links to Instagram's homepage. Replace with the real handle (e.g., `https://instagram.com/berbernica.trisha/`). A working Instagram profile is the most realistic third-party authority signal for a Belgrade barbershop and is required as a `sameAs` target for the JSON-LD above. (Phase B step 5 dependency; trivial code fix.)
3. **Surface `datePublished` / `dateModified`** on the homepage (e.g., a small "Ažurirano: 2026-04-29" footer line, plus the same in `Article` or `LocalBusiness.dateModified` JSON-LD). ChatGPT's web search prefers content with verifiable freshness — currently there is *no* date string anywhere in the homepage HTML. (Phase B step 2 / step 5.)

---

### Perplexity AI

**Score: 31 / 100** — Poor

| Signal Category | Score | Key Findings |
|---|---|---|
| Community Validation | 6 / 30 | DuckDuckGo `site:reddit.com berbernica Beograd` surfaces ~4 relevant Reddit threads (mostly r/serbia, none in r/Beograd specifically; topics: "openining a barbershop, suggest names", "Berbernica" short post, "Barbershop/salon za muskarce u Beogradu", and a beard-elixir thread). **None mention "Berbernica Triša"**. There is no Stack Overflow / Quora discussion (not the right community for this category). The six on-page Google review excerpts, dated "1 mes."/"3 ned.", are genuinely valuable — but Perplexity weights *third-party* community discussion, not on-site self-quotes. Reddit visibility for the brand specifically is **zero**. |
| Source Directness | 14 / 30 | The site IS the primary source for its own NAP, prices, services, and opening hours — strong on directness in principle. But without LocalBusiness JSON-LD, Perplexity can't programmatically extract the structured facts; it has to scrape them from prose. The address is in plain text + a Google Maps link. The phone `065 9003 742` is in plain text but **not** as `tel:` — Perplexity citation cards prefer click-to-call markup. |
| Content Freshness | 5 / 20 | **No `datePublished`, no `dateModified`, no visible "Last updated" anywhere.** The Google review badges say "1 mes." / "3 ned." which is the freshest signal on the page, but those are inline UI text, not machine-readable dates. PWA service worker is network-first so freshness will propagate, but there is no signal Perplexity can read to verify maintenance cadence. |
| Technical Access | 6 / 20 | `/robots.txt` 404 → PerplexityBot is default-allowed (positive). Page is fully server-rendered (Phase A.1: SSR 95/100), so PerplexityBot's limited JS execution is a non-issue — the entire content is in the initial HTML. **Negative:** no sitemap, so PerplexityBot has no discovery scaffolding; the dual-script Cyrillic+Latin duplication doubles the visible-text token count Perplexity has to dedupe. |

**Optimization Actions:**
1. **Seed Reddit / r/Beograd ourselves with one organic mention** — comment on existing barbershop-recommendation threads (the four already discovered), or post a "I tried a barbershop in Batajnica, here's what was good/bad" first-person review. Perplexity's training corpus + live retrieval both index Reddit aggressively; one good thread on r/Beograd or r/serbia is worth 50 backlinks for this category. (Phase B / off-site, not in §5 but flag for Phase D.)
2. **Wire phone as `tel:+381659003742`** and address as a `<address>` element with `LocalBusiness` JSON-LD `address` + `geo` properties. Perplexity citation cards include click-to-call when `tel:` is present and the schema confirms NAP; without it the card just renders prose. (Phase B step 5 + a tiny markup fix in step 2.)
3. **Add a visible "Ažurirano: YYYY-MM-DD" line** in the footer and emit `dateModified` in JSON-LD on every public route. Perplexity penalizes pages with no freshness signal when answering "best barbershop" / "near me" queries because it cannot verify the business is still operating.

---

### Google Gemini

**Score: 47 / 100** — Fair

| Signal Category | Score | Key Findings |
|---|---|---|
| Google Ecosystem | 24 / 35 | **Strong positive:** the site self-reports "4.9 ★ Google ocena" with six dated review excerpts ("Google · 1 mes.", "Google · 3 ned."), which is direct evidence a Google Business Profile **exists and is active** — this is the single biggest GEO asset Berbernica has. (Google Maps WebFetch was JS-only and could not be confirmed externally, but the on-page evidence is strong.) The site links out to `maps.google.com/?q=Majora%20Zorana%20Radosavljevi%C4%87a%20226b%2C%20Batajnica`, which means the address is at least geo-resolvable. **Gaps:** no YouTube channel referenced, no Google Scholar / Books relevance (correct for a barbershop), no Google News inclusion (correct — too small). |
| Knowledge Graph | 8 / 30 | Without `Organization` / `LocalBusiness` JSON-LD on the site, Google's Knowledge Graph has only the GBP record to work with — it will populate a Knowledge Panel for branded queries but will not tie the website to the entity strongly. No `sameAs` schema, no consistent NAP across multiple Google properties (one website + presumed one GBP, no second source). The site's NAP **does** match the Google Maps URL exactly, which is a small KG-consistency win. |
| Content Quality | 15 / 35 | Comprehensive long-form content is **absent** — homepage is short marketing copy + a services preview + six review snippets + an opening-hours block. There is no blog, no service detail pages (every service is one card on `/zakazivanje`, no `/usluge/sisanje` style URLs), no topical clustering. Multi-format: ~6 hero images preloaded but no embedded video. Internal linking demonstrates basic topical authority (`/zakazivanje`, `/shop`, `/shop/[slug]`) but the topical surface is shallow — there are 12 PDPs in `/shop` but no related-post linking, no service category pages. Gemini prefers depth-and-breadth, and the site has neither yet. |

**Optimization Actions:**
1. **Add `LocalBusiness` JSON-LD with `sameAs` linking to the GBP / Maps URL and the (real) Instagram handle**, plus `aggregateRating { ratingValue: 4.9, reviewCount: <real count from GBP> }`. This pulls the existing GBP signal into the website's Knowledge Graph entry — currently the two are floating apart. (Phase B step 5; highest single-action lift on this platform.)
2. **Verify and complete the Google Business Profile** off-site: add the website URL to the GBP, add 5–10 high-quality photos, add Services with prices matching the website, set categories to `Barber shop` + `Beauty salon`. The website is already echoing the GBP rating, so the GBP exists — the question is whether the website URL is set on it. (Phase D off-site; out of §5 scope but flag.)
3. **Build per-service landing pages** at `/usluge/sisanje`, `/usluge/brijanje`, `/usluge/brada-i-styling` and link them from both the homepage and the booking flow. Each gets its own H1, a 200-word description in `sr-Cyrl`, the price, the duration, and `Service` JSON-LD. This addresses the topical-depth gap directly. (Phase B step 5 + content; can be folded into i18n step 4.)

---

### Bing Copilot

**Score: 22 / 100** — Critical

| Signal Category | Score | Key Findings |
|---|---|---|
| Bing Index Signals | 4 / 30 | No `/sitemap.xml` (Phase A.1 confirmed 404) — IndexNow opportunity is **zero** (IndexNow needs a sitemap or per-URL ping endpoint). No `msvalidate.01` meta tag (verified by precise meta-tag parse: 0 site-verification tags). No `BingSiteAuth.xml`. No evidence of Bing Webmaster Tools registration. Default-open `robots.txt` (because file is missing) means Bingbot can crawl, but there is no scaffolding to help it. |
| Content Preferences | 12 / 30 | Clean structured content, professional tone, decent SSR visible HTML — that's the reason this category is not zero. Bing Copilot prefers workplace/enterprise queries, which a barbershop is not — *category mismatch*. Authoritative sourcing is weak (no citations, no expert byline). Quotable one-liners are present. |
| Microsoft Ecosystem | 0 / 20 | No LinkedIn company page link found (precise grep: 0). No GitHub. No Microsoft Teams / 365 integration. No Microsoft-related partnerships. For a small Serbian barbershop this is unsurprising and difficult to fix — the audience is not on LinkedIn. |
| Technical Signals | 6 / 20 | SSR is solid (Phase A.1 — 95/100). Mobile-optimized (Phase A.1 — 90/100). HTML semantics are clean. **Negatives:** no Bing-compatible structured data (zero JSON-LD), images lack `width`+`height` (CLS risk), 6 hero images all preloaded (LCP risk). |

**Optimization Actions:**
1. **Ship `app/sitemap.ts`** (Phase B step 1) and submit it to Bing Webmaster Tools. Add `msvalidate.01` meta tag to the root layout once verification is generated. This is the table-stakes ladder rung — without it Bing has nothing to crawl on a schedule. Effort: ~2 hours total.
2. **Submit URLs via the IndexNow API** (Bing + Yandex shared protocol) every time a product or service page changes. With Next.js App Router this is a single `fetch('https://api.indexnow.org/IndexNow', { method: 'POST', body: ... })` call from a Supabase database webhook on `proizvodi` / service updates. Bing weights IndexNow heavily; for a small site it's the fastest path to a fresh index.
3. **Realistically deprioritize this platform** — Bing's share of Serbian search is in the low single digits, Bing Copilot has no anchor signal for this business, and Microsoft ecosystem alignment is a category mismatch. Do steps 1–2 once for completeness; do not invest deeper. The 30 minutes/quarter saved here funds the high-leverage Perplexity Reddit-seeding work.

---

### Cross-Platform Synergies

Actions that improve multiple platforms simultaneously, ranked by leverage:

1. **Ship `LocalBusiness` + `Organization` + `FAQPage` JSON-LD on the homepage** (one PR) — Impacts: **Google AIO** (source-authority + technical signals), **ChatGPT Web Search** (entity recognition — closes the largest gap), **Google Gemini** (Knowledge Graph anchoring of the GBP to the site), **Perplexity** (source directness + structured fact extraction), **Bing Copilot** (technical signals). Five-platform lift from one schema block. **Highest-leverage action in the entire audit.**
2. **Generate `app/robots.ts` + `app/sitemap.ts`** — Impacts: **AIO** (technical), **ChatGPT** (crawler access full marks), **Perplexity** (technical access), **Bing Copilot** (Bing index signals — biggest single gain on this platform), **Gemini** (Google ecosystem). Five-platform lift, near-zero engineering cost.
3. **Add per-route `generateMetadata` with canonical + Open Graph + Twitter Card + dateModified** — Impacts: **AIO** (content structure deduplication), **ChatGPT** (content preferences — freshness signal), **Perplexity** (freshness), **Gemini** (content quality + KG consistency). Four-platform lift; also fixes the duplicate-title issue Phase A.1 flagged on three of four routes.
4. **Fix the Instagram placeholder + add real social `sameAs` array** — Impacts: **ChatGPT** (entity recognition third-party confirmation), **Perplexity** (community validation outbound), **Gemini** (KG sameAs). Three-platform lift, 5-minute code change.
5. **Add `tel:+381...` link + `<address>` semantic markup + visible "Ažurirano: …" date** — Impacts: **AIO** (citable NAP), **ChatGPT** (freshness), **Perplexity** (citation card click-to-call), **Gemini** (NAP consistency). Four-platform lift, single-component change.

### Priority Actions (All Platforms)

Each tagged with the Phase B step from §5 that addresses it.

1. **[CRITICAL]** Ship `LocalBusiness` + `Organization` + `FAQPage` JSON-LD on `/`, `Service` JSON-LD on `/zakazivanje` services, `Product`+`Offer` on `/shop/[slug]`, `BreadcrumbList` everywhere — Affects: **AIO + ChatGPT + Perplexity + Gemini + Bing** — Effort: Medium — **Phase B.5 (LocalBusiness JSON-LD) covers ChatGPT entity recognition + Gemini KG + AIO source authority simultaneously — highest leverage action in this audit.**
2. **[CRITICAL]** Ship `app/robots.ts` (default-allow with CCBot blocked, Sitemap declared) + `app/sitemap.ts` (homepage, `/zakazivanje`, `/shop`, all active products with `lastmod`) — Affects: **AIO + ChatGPT + Perplexity + Bing + Gemini** — Effort: Low — **Phase B.1 (robots.txt + sitemap) covers crawler access + Bing IndexNow eligibility.**
3. **[CRITICAL]** Per-route `generateMetadata` with unique title, description, canonical, Open Graph, Twitter Card, and `dateModified` (homepage, `/zakazivanje`, `/shop` — PDP already has title+description, needs canonical+OG+Twitter+date) — Affects: **AIO + ChatGPT + Perplexity + Gemini** — Effort: Low — **Phase B.2 (meta tags) + Phase B.3 (canonical / OG / Twitter Card) cover content-structure dedup, freshness, and Knowledge Graph consistency.**
4. **[HIGH]** Decide and implement i18n strategy for `sr-Cyrl` ↔ `sr-Latn` — route-level locale (`/sr-Cyrl/...` + `/sr-Latn/...`) with `<link rel="alternate" hreflang>` cross-references, removing the dual-script duplication from a single HTML payload — Affects: **AIO** (deduplication) + **ChatGPT** (clean entity surface) + **Gemini** (clean KG ingestion) + **Bing** (HTML payload size) — Effort: High — **Phase B.4 (internationalization).**
5. **[HIGH]** Fix Instagram placeholder URL, add real Instagram + Google Maps + GBP URLs to JSON-LD `sameAs` array, wire phone as `tel:+381...` — Affects: **ChatGPT + Perplexity + Gemini** — Effort: Low — **Phase B.5 dependency; 5-minute markup fix in Phase B.2.**
6. **[HIGH]** Add a homepage FAQ section (4–6 question-anchored entries answering geographic, price, booking, hours, and service-scope queries) with `FAQPage` JSON-LD — Affects: **AIO** (answer-target pattern) + **ChatGPT** (quotable Q&A) + **Perplexity** (direct-source citations) + **Gemini** (topical depth) — Effort: Medium — **Phase B.5 + content authoring (could fold into Phase B.4 sr-Cyrl/sr-Latn copy work).**
7. **[MEDIUM]** Render services + prices as a real `<table>` with columns *Usluga · Trajanje · Cena*, in addition to the visual cards — Affects: **AIO** (table extraction) + **Gemini** (structured comparison) — Effort: Low — **Phase B.5 (alongside Service JSON-LD).**
8. **[MEDIUM]** Submit sitemap to Bing Webmaster Tools, add `msvalidate.01` meta tag, wire IndexNow API ping on product/service updates — Affects: **Bing Copilot** primarily — Effort: Low — **Phase B.1 (sitemap) + a small Phase B addition for IndexNow.**
9. **[MEDIUM]** Build 3–4 per-service landing pages (`/usluge/sisanje`, `/usluge/brijanje`, `/usluge/brada`) with their own H1, ~200-word description, price, duration, and `Service` JSON-LD — Affects: **Gemini** (topical depth — biggest single Gemini lift after JSON-LD) + **AIO** (additional ranking targets) — Effort: Medium — **Phase B.5 + content; can ride the Phase B.4 i18n PR.**
10. **[LOW]** Off-site: complete the Google Business Profile with website URL, photos, services-with-prices, correct categories. Seed one r/Beograd / r/serbia thread organically about Batajnica/Zemun barbershops. — Affects: **Gemini + Perplexity** — Effort: Low engineering, Medium operational — **Out of §5 Phase B scope; flag for Phase D off-site / community track.**

---

## Summary

1. **Platform Readiness Average: 33/100** — Poor across the board, but with a clear technical-debt root cause (no JSON-LD, no robots/sitemap, dual-script duplication) rather than a content-quality root cause.
2. **Strongest:** Google Gemini (47/100), driven entirely by an active Google Business Profile that the site already echoes ("4.9 ★ Google ocena" + six dated reviews in HTML). **Weakest:** Bing Copilot (22/100) — no sitemap for IndexNow, no Bing Webmaster verification, no Microsoft-ecosystem footprint, and the category itself (Belgrade barbershop) is a poor fit for Copilot's enterprise-leaning index.
3. **Single highest-leverage cross-platform action:** ship `LocalBusiness` + `Organization` + `FAQPage` JSON-LD on the homepage in Phase B.5. One PR, five-platform lift, simultaneously closes ChatGPT's entity-recognition gap, anchors the existing GBP to the website in Gemini's Knowledge Graph, and gives AIO/Perplexity the structured facts they need for citation cards.
4. **Effectively unreachable platform:** **Bing Copilot** — the engineering work in actions 1–8 will pull it from 22 → ~45/100, but no realistic action ladder gets it to Excellent for a small Belgrade barbershop. Microsoft ecosystem alignment is a category mismatch and Bing's Serbia market share is too small to justify deeper investment. Treat Bing as a "do the cheap basics once and walk away" platform.
5. **One nuance worth flagging for Phase B planning:** the Instagram link is a placeholder (`https://instagram.com/`) — this is a 5-minute fix that, paired with the JSON-LD `sameAs` work in Phase B.5, gives the highest entity-recognition lift per minute of any action on the list. Worth pulling out of Phase B.5 and shipping in a tiny preceding PR alongside Phase B.1 (robots/sitemap).
6. **Phase A.1 → A.2 consistency check:** every gap A.2 identified is already on A.1's priority list (JSON-LD #4, robots/sitemap #1+#2, per-route metadata #3, i18n #5). A.2 reorders by *AI-platform leverage* rather than by *technical-SEO severity* — same diagnoses, slightly different ranking.
