# Phase A.4 — llms.txt Analysis & Draft

| Field | Value |
|---|---|
| Date | 2026-04-29 |
| Phase | A.4 — llms.txt baseline + draft (workflow §5 step 4) |
| Target | `http://localhost:3050/` (Next.js 14 dev server, App Router, SSR) |
| Reference | `~/.claude/skills/geo-seo/geo-llmstxt/SKILL.md`, `https://llmstxt.org` (Howard, Sept 2024) |
| Mode | Generation (no existing file to validate) |
| Output | `docs/seo/llms.txt.draft` (this phase, read-only) → `web/public/llms.txt` (Phase B handoff) |

---

## TL;DR

- `/llms.txt` and `/llms-full.txt` both return **HTTP 404**.
- `/robots.txt` also 404 (already flagged by Phase A.1).
- The site is **invisible** to AI agents that look for the llms.txt convention — they have no controlled-narrative entry point and must crawl SSR HTML and infer everything.
- A complete, hand-crafted draft `llms.txt` is ready at `docs/seo/llms.txt.draft` covering: 1 homepage + 1 booking + 1 shop list + 12 PDPs + a services/prices block + key facts + contact.
- The format spec has no first-class i18n support; we addressed the dual-script Serbian (sr-Cyrl ↔ sr-Latn) by writing the file in Latin Serbian and adding a bilingual comment block explaining the script duality. Recommended.
- The draft is structurally complete but **needs human review** before commit: (a) production domain to swap in (currently `http://localhost:3050`), (b) Serbian copywriting polish on descriptions, (c) per-PDP price/availability accuracy verification against live Supabase data at deploy time.

---

## Current state (baseline)

```
$ curl -sSI http://localhost:3050/llms.txt        → HTTP/1.1 404 Not Found
$ curl -sSI http://localhost:3050/llms-full.txt   → HTTP/1.1 404 Not Found
$ curl -sSI http://localhost:3050/robots.txt      → HTTP/1.1 404 Not Found
$ curl -sSI http://localhost:3050/sitemap.xml     → HTTP/1.1 404 Not Found
```

No file in `web/public/` references llms.txt. The Next.js project ships only PWA assets (`manifest.json`, `sw.js`, icons, logo) — no SEO/AI-discovery files at all.

→ Site is invisible to AI agents that look for `llms.txt`-format hints. Combined with the missing `robots.txt` and `sitemap.xml` (Phase A.1), this is the worst-case "generic page, no narrative control" position. The fix is mechanical: write the three files and ship them.

---

## Analyzer output

The reference generator (`~/.claude/skills/geo-seo/scripts/llmstxt_generator.py`) was run against `http://localhost:3050/` and output:

```json
{
  "url": "http://localhost:3050/llms.txt",
  "exists": false,
  "format_valid": false,
  "has_title": false,
  "has_description": false,
  "has_sections": false,
  "has_links": false,
  "section_count": 0,
  "link_count": 0,
  "content": "",
  "issues": ["llms.txt returned status 404"],
  "suggestions": [],
  "full_version": {
    "url": "http://localhost:3050/llms-full.txt",
    "exists": false
  }
}
```

The bundled generator only validates and reports — it does not auto-synthesize a draft from a 404. So the draft below was hand-crafted from a manual crawl of `/`, `/zakazivanje`, `/shop`, and one sample `/shop/[slug]` PDP, plus product slug enumeration via the shop catalog HTML.

---

## Crawl-derived inventory

| Route | HTTP | Title (from `<title>`) | Per-route metadata? | Word count (text) | Notable content |
|---|---|---|---|---|---|
| `/` | 200 | "Берберница Триша · Батајница" | No (inherits root layout) | ~941 | Hero, about, 11-service price list, 4 metric cards, 5 testimonials, NAP block, footer |
| `/zakazivanje` | 200 | "Берберница Триша · Батајница" | No (inherits root) | ~182 | 4-step booking wizard (service → date → slot → contact). Lists all 11 services with duration + price. |
| `/shop` | 200 | "Берберница Триша · Батајница" | No (inherits root) | ~215 | 12 products in 4 categories (POMADE, BRADA, ŠAMPON, AFTERSHAVE). Pickup-only label. |
| `/shop/pomada` | 200 | "Pomada — TRIŠA · Berbernica Triša" | **Yes** (per-product `generateMetadata`) | ~128 | PDP with stock badge, price, qty selector, related items |

PDP slug enumeration (12 active products, found via product cards on `/shop`):
```
/shop/pomada
/shop/pomada-batajnica
/shop/classic-pomade
/shop/fiber-matte
/shop/pomade-american-crew
/shop/ulje-za-bradu
/shop/balzam-za-bradu
/shop/sampon-za-bradu
/shop/sampon-azur-lime
/shop/daily-shampoo
/shop/after-shave-losion
/shop/after-shave-balzam
```

Excluded from llms.txt:
- `/admin/*` — auth-gated, not public content.
- `/api/*` — internal endpoints.
- `/dev/*`, `/offline` — developer/PWA fallback routes.
- `/manifest.json`, `/sw.js`, `/_next/*` — PWA + bundler infrastructure (kept `manifest.json` under `Optional` as a courtesy hint).

---

## Format compliance considerations

### 1. Dual-script i18n (sr-Cyrl + sr-Latn)

The llms.txt spec has **no first-class i18n primitive** — it assumes a single canonical body of text. Berbernica's HTML inlines both Cyrillic and Latin variants in the same DOM and toggles them via `data-sr` / `data-lat` attributes plus the `data-lang` cookie/CSS swap. Same content, two scripts.

Three viable strategies; we picked (B):

- **(A) Two separate files** — `llms.txt` (Cyrillic) and a non-standard `llms-lat.txt` (Latin). **Rejected** — the spec doesn't define this and AI agents won't fetch the second file.
- **(B) Single Latin file with a script-explanation comment** — write llms.txt in Serbian Latin (sr-Latn) because it parses more reliably across LLMs (which were trained on far more sr-Latn than sr-Cyrl), and add an HTML comment in both scripts explaining that the site itself supports both. **Chosen.**
- **(C) Dual-language entries inline** (e.g. `[Početna / Homepage](url): Pregled... / Overview...`). **Partially adopted** for section headings only (`## Glavne stranice / Main pages`) so that English-only AI agents can still navigate; the per-link descriptions stay in sr-Latn to avoid bloating the file.

The decision is logged inside the draft as a comment at the bottom.

### 2. Section organization

The spec recommends 1–6 H2 sections. We used 6:
1. `## Glavne stranice / Main pages` — the 3 primary public routes
2. `## Proizvodi (PDP) / Product detail pages` — 12 PDPs
3. `## Usluge i cene / Services and prices` — 11 services with duration + RSD price
4. `## Ključne činjenice / Key facts` — business-level data (NAP, year, ratings, languages)
5. `## Kontakt / Contact` — phone + address + map link
6. `## Optional` — manifest.json reference

This is at the upper bound of "concise" but justified: a barbershop with an integrated shop has two distinct content modalities (services vs products) and AI agents searching for either should land on the right list directly.

### 3. URL absoluteness

All URLs in the draft use the full `http://localhost:3050` prefix (per spec requirement). A `<!-- TODO -->` comment at the top of the file flags the prod-domain swap for Phase B.

### 4. What to NOT include

Following spec best practices, we excluded:
- `/manifest.json`, `/sw.js` from the main sections (PWA infrastructure, no narrative content). `/manifest.json` listed under `Optional` only because a curious AI might want to know the site is a PWA.
- `/admin/*` — auth-gated; including admin URLs in llms.txt would be a footgun.
- `/_next/*`, `/icons/*`, fonts — bundler infrastructure.
- `/offline` — service-worker fallback page; no useful narrative.
- Pricing footnote ("cene su orijentacione, potvrditi sa Trišom") — this is on the homepage but feels too speculative for a canonical AI-citation source. We added it as a one-line caveat in the services section instead of treating each price as gospel.

---

## Recommended llms.txt structure (draft inline)

The full draft is at `docs/seo/llms.txt.draft`. Excerpt of the H1 + blockquote + first section:

```markdown
# Berbernica Triša

> Tradicionalna muška berbernica u Batajnici (Beograd), osnovana 2025.
> Šišanje, brada, brijanje — bez žurbe, bez komplikacija. Termini se zakazuju
> isključivo preko aplikacije; plaćanje gotovinom ili karticom u salonu.
> Sajt je dostupan na srpskom (ćirilica i latinica).

## Glavne stranice / Main pages

- [Početna / Homepage](http://localhost:3050/): Pregled berbernice — lokacija
  (Batajnica), istorijat (osnovana 2025), 11 usluga sa cenama (od 200 do 2.500
  RSD), galerija, Google ocene 4.9★, mušterijski utisci, NAP (adresa Majora
  Zorana Radosavljevića 226b, telefon 065 9003 742). Petogodišnje iskustvo,
  60+ stalnih mušterija.

- [Zakazivanje / Booking](http://localhost:3050/zakazivanje): Četvorostepeni
  booking flow (usluga → datum → termin → podaci → potvrda)…

- [Prodavnica / Shop](http://localhost:3050/shop): Online prodavnica preparata
  za negu kose, kože i brade. 12 aktivnih proizvoda…
```

The full draft has **6 H2 sections**, **27 page links** (3 main + 12 PDP + 11 services represented as price-list bullets + 1 optional), **~115 lines**, fits within the spec's 50–200 line guidance.

### Format validation against spec checklist

| Element | Present | Notes |
|---|---|---|
| H1 title | Yes | `# Berbernica Triša` (matches official brand) |
| Blockquote description | Yes | 4 lines, ~285 chars (slightly over the 200-char "ideal" but justified by needing to convey: type, location, year, services, payment, language). Acceptable per spec — the 200-char rule is "should," not "must." |
| ≥1 H2 section | Yes | 6 sections |
| Page entries with URLs | Yes | 15 link entries with absolute URLs |
| Descriptions present | Yes | All 15 entries have descriptive text after the colon |
| Key Facts section | Yes | 11 line items |
| Contact section | Yes | Phone + address + map link |
| Reasonable length | Yes | ~115 lines (within 50–200) |
| Markdown clean | Yes | No broken syntax |

---

## Quality scoring (estimate, per skill rubric)

| Dimension | Estimated score | Rationale |
|---|---|---|
| Completeness | 90/100 | Covers all 15 public-facing routes; key facts complete; misses only that we don't have a separate `/about` or `/contact` page (the homepage is the about+contact page in this design). |
| Accuracy | 85/100 | Service prices and product list match the live HTML as of 2026-04-29; flagged as "orijentacione" per the homepage's own caveat. Production-domain TODO and per-PDP availability re-check are explicit. |
| Usefulness | 90/100 | An AI agent reading this could correctly answer: "What does Berbernica Triša sell?", "Where are they?", "How much is a fade?", "Do they deliver products?" — without crawling a single HTML page. |

**Overall draft score (pre-review)** ≈ **88/100**. After human polish + prod-domain swap, target 95+.

---

## Phase B handoff

### Phase B.4 (already in workflow §5)

Generate LocalBusiness JSON-LD using `~/.claude/skills/geo-seo/schema/local-business.json`. The data we just compiled here (NAP, hours via `salons.working_hours`, services, ratings) feeds directly into the schema file.

### Phase B.9 (already in workflow §5) + Phase B.10 (recommended new)

The original §5 has Phase B.9 as "AI bot policy in robots.txt" but does NOT have an explicit "commit llms.txt" step. **Recommend adding Phase B.10:**

- **Phase B.10 — Commit llms.txt:**
  1. Copy `docs/seo/llms.txt.draft` → `web/public/llms.txt`.
  2. Replace `http://localhost:3050` with the production domain throughout.
  3. Optionally also create `web/public/llms-full.txt` if the brand wants per-PDP narrative depth (current draft is concise enough that llms-full would be redundant — skip for v1).
  4. Add a `Sitemap:` directive to `robots.txt` AND a `# llms.txt: /llms.txt` comment line for discoverability.
  5. Verify `https://<prod-domain>/llms.txt` returns 200 with `Content-Type: text/plain; charset=utf-8` (not `text/html` — a common Next.js gotcha when serving non-HTML files from `public/`).
  6. Commit message: `feat(seo): add llms.txt for AI agent discovery (Phase B.10)`.

### Re-run cadence

- After every shop product add/remove/repricing → regenerate the PDP section.
- After every service price change → regenerate the services section.
- Quarterly content review (the spec recommends this for stable sites; Berbernica's catalog churns slowly, so quarterly is fine).

---

## Open questions / human-review checklist

Before Phase B.10 commit, a Serbian-speaking reviewer should verify:

1. **Production domain** — what is the registered domain? (Currently unknown; placeholder is localhost.) `next.config.mjs` and `.env.local` only reference `http://localhost:3050`.
2. **Service prices** — is the homepage's own caveat ("cene su orijentacione, potvrditi sa Trišom pre lansiranja") still applicable, or have the prices been finalized?
3. **Product availability** — the 12 PDP slugs were enumerated from the live `/shop` HTML on 2026-04-29; if Supabase is the source of truth, regenerate this section against `SELECT slug, name_lat, brand, price FROM products WHERE active = true` at deploy time.
4. **Phone number format** — drafted as `+381 65 9003 742` (E.164) in the contact section but `065 9003 742` (national) on the homepage. Pick one for consistency.
5. **Tone** — the draft uses the same direct, no-fluff voice as the homepage copy ("bez žurbe, bez komplikacija"). Confirm with the brand owner that this is the desired voice for AI-citation sources.
6. **Cyrillic version?** — if the brand strongly prefers Cyrillic as primary, swap the file to sr-Cyrl (the comment block at the bottom already documents both choices). LLM parsing of sr-Cyrl is improving but still weaker than sr-Latn as of 2026-04, so default Latin is safer for visibility.

---

## Raw analyzer JSON

<details><summary>Click to expand</summary>

```json
{
  "url": "http://localhost:3050/llms.txt",
  "exists": false,
  "format_valid": false,
  "has_title": false,
  "has_description": false,
  "has_sections": false,
  "has_links": false,
  "section_count": 0,
  "link_count": 0,
  "content": "",
  "issues": [
    "llms.txt returned status 404"
  ],
  "suggestions": [],
  "full_version": {
    "url": "http://localhost:3050/llms-full.txt",
    "exists": false
  }
}
```

</details>

---

## Files referenced (absolute paths)

- Draft llms.txt (this phase output): `/home/kaizenlinux/Projects/Luka_Projects/LukaPr_Trisha/Berbernica/docs/seo/llms.txt.draft`
- Analysis report (this file): `/home/kaizenlinux/Projects/Luka_Projects/LukaPr_Trisha/Berbernica/docs/seo/audit-2026-04-29-phase-a-4-llmstxt.md`
- Reference skill: `/home/kaizenlinux/.claude/skills/geo-seo/geo-llmstxt/SKILL.md`
- Generator script: `/home/kaizenlinux/.claude/skills/geo-seo/scripts/llmstxt_generator.py`
- Phase B target (NOT touched in Phase A): `/home/kaizenlinux/Projects/Luka_Projects/LukaPr_Trisha/Berbernica/web/public/llms.txt` (does not yet exist)
- Source pages crawled: `web/src/app/page.tsx`, `web/src/app/zakazivanje/page.tsx`, `web/src/app/shop/page.tsx`, `web/src/app/shop/[slug]/page.tsx`
- Salon NAP source: `web/src/app/page.tsx:392, 420, 428` — address `Majora Zorana Radosavljevića 226b, Batajnica`, phone `065 9003 742`
