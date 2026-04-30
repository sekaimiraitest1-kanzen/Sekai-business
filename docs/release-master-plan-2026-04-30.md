---
name: Trisha — Release Master Plan
description: Single-source-of-truth checkpoint of all remaining work to ship V1. Consolidates SEO Phase B handoff, my earlier release-readiness tracks, social-links feature, and admin deferred items. Updated when sprints close.
type: master-plan
date: 2026-04-30
status: ACTIVE — Phase B shipped, awaiting Stefan inputs (domain + IG + GBP) for plug-in
prerequisite-reads:
  - docs/seo/phase-b-completion-2026-04-30.md
  - docs/seo/phase-b-next-session-handoff.md
  - docs/admin-phase-1-4-confidence.md
---

# Trisha — Master Release Plan

## State 2026-04-30 EOD

- **HEAD**: `3447649` (12 commits past `454dd7b`, all locally verified, NOT pushed to origin)
- **Build**: `npx tsc --noEmit` PASS, `npm run build` PASS
- **Routes**: 8/8 return 200 (smoke verified post-SEO-session)
- **Working tree**: 1 untracked — `supabase/migrations/005_social_links.sql` (mine, ready to commit)
- **Stefan deliverables pending**: production domain, Instagram URL, GBP public URL, optional FB/TikTok/X/LinkedIn

---

## Sprint plan

### Sprint 1 — Social links + push (this session, ~2.5h)

**Goal**: Land social-links feature end-to-end so Stefan can manage everything from admin once domain arrives. Push 12+1 commits to origin.

| # | Task | Effort |
|---|---|---|
| S1-1 | Commit `005_social_links.sql` migration | 5 min |
| S1-2 | Apply migration to remote Supabase (psql to `db.ljxovmahbyxgyyttvldv.supabase.co`) | 10 min |
| S1-3 | Build `web/src/lib/social-links.ts` — types, platform metadata, URL validators | 30 min |
| S1-4 | Build `web/src/components/social-icons.tsx` — outline mono SVGs in brand mustard for IG/FB/TT/LI/X | 45 min |
| S1-5 | Build `web/src/components/social-links-row.tsx` — footer renderer, conditional on `enabled && url` | 20 min |
| S1-6 | Add `updateSocialLinks` Server Action in `podesavanja/actions.ts` with URL validation | 30 min |
| S1-7 | Add "DRUŠTVENE" tab to `podesavanja-client.tsx` — 5-row checkbox+URL form, save button | 1h |
| S1-8 | Update `podesavanja/page.tsx` to fetch `salons.social_links` | 10 min |
| S1-9 | Wire `<SocialLinksRow>` into `site-footer.tsx` below 4-column grid | 15 min |
| S1-10 | Replace IG placeholder in `page.tsx:325` with conditional `salon.social_links.instagram` | 10 min |
| S1-11 | Wire `sameAs[]` in `local-business.ts` from social_links + accept GBP URL via env var | 20 min |
| S1-12 | TypeScript + build sanity, smoke test all routes | 15 min |
| S1-13 | Commit in 3 groups: `feat(social): db + types`, `feat(social): admin UI`, `feat(social): footer + sameAs` | 10 min |
| S1-14 | Push all commits to origin (`git push origin main`) | 5 min |

**Exit criteria**: Admin can toggle 5 platforms + paste URLs at `/admin/podesavanja` → DRUŠTVENE tab; footer renders icons conditionally; sameAs JSON-LD reads from DB; everything pushed.

---

### Sprint 2 — Production infrastructure (~3h, no domain needed)

**Goal**: Vercel project linked, env vars set with placeholder URL, preview deploy works.

| # | Task | Effort | Domain blokera? |
|---|---|---|---|
| S2-1 | Vercel: import git repo, set root `web/`, build `npm run build`, install `npm ci` | 20 min | Ne — preview URL `*.vercel.app` |
| S2-2 | Vercel env vars (production + preview): `NEXT_PUBLIC_SITE_URL=<vercel-preview-url>`, all Supabase keys, Resend keys, anything from `.env.local` | 20 min | Ne |
| S2-3 | Trigger first preview deploy → verify all 8 routes 200 + JSON-LD live | 15 min | Ne |
| S2-4 | Supabase: audit RLS on user-facing tables (bookings, orders, products, salons read-only for anon) | 1h | Ne |
| S2-5 | Decision: Supabase free tier vs Pro $25/mo. Free: 500MB DB, 2GB bandwidth/mo, no auto-backup. | 15 min Stefan call | Ne |
| S2-6 | Database backups: if free tier, set up cron `pg_dump → S3/local` | 30 min | Ne |
| S2-7 | Custom domain placeholder note: when Stefan delivers `<domain>`, just (a) Vercel dashboard add custom domain, (b) update env `NEXT_PUBLIC_SITE_URL=https://<domain>`, (c) re-deploy. Document in `docs/release-domain-plugin.md`. | 15 min | Ne (priprema) |

**Exit criteria**: Working preview deploy on `*.vercel.app`, Supabase RLS clean, backup story decided.

---

### Sprint 3 — Email + legal + content polish (~4h)

**Goal**: Everything that's not infrastructure but still must ship pre-launch.

| # | Task | Effort | Stefan input? |
|---|---|---|---|
| S3-1 | Email templates polish — review all 4 (booking confirm, walk-in, pickup-ready, order-status). SR + LAT consistency. Mobile preview. Visual brand consistency. | 1h | — |
| S3-2 | Email deliverability prep — document DKIM/SPF/DMARC DNS records to add when domain arrives | 30 min | — |
| S3-3 | Privacy Policy `/privatnost` — bilingual, GDPR-aware, lists data we collect (booking, orders, lang cookie) + processors (Supabase, Resend, Vercel) | 2h | Stefan reviews legal copy |
| S3-4 | Terms of Service `/uslovi-koriscenja` — booking cancellation, walk-in policy, shop pickup, payment terms | 1.5h | Stefan reviews |
| S3-5 | Cookie banner / notice — minimal "ovaj sajt koristi tehničke kolačiće za jezik i sesiju" notice with dismiss; no consent gate (no tracking yet) | 1h | — |
| S3-6 | Imprint / Impressum block in footer — Trišin pravni naziv firme, adresa, PIB, MB | 30 min | Stefan donosi podatke |
| S3-7 | 404 page — branded, link na home + booking | 30 min | — |
| S3-8 | 500 / global-error page — branded, fallback contact info | 30 min | — |
| S3-9 | Favicons audit — verify all sizes present (16, 32, 192, 512, apple 180) iz finalne brand asset-e | 30 min | — |

**Exit criteria**: Legal pages live, error pages branded, email pipeline polished, deliverability docs ready.

---

### Sprint 4 — Analytics + monitoring + perf (~4h, no domain needed)

**Goal**: Observability + final perf pass.

| # | Task | Effort |
|---|---|---|
| S4-1 | Plausible (preferred — GDPR-friendly, no cookies) ili GA4. Stefan odluka. Wire-up sa env-var site-id | 30 min |
| S4-2 | Custom event tracking: booking-completed, walk-in-created, order-placed, lang-toggle, admin-login | 1h |
| S4-3 | Sentry free tier ili Supabase `error_log` table — global error boundary u `app/error.tsx` + `app/global-error.tsx` | 1.5h |
| S4-4 | UptimeRobot free (5-min checks) — placeholder URL dok ne stigne pravi | 15 min |
| S4-5 | Vercel Analytics — auto na deploy, samo verifikuj | 5 min |
| S4-6 | Lighthouse audit (mobile + desktop) — target 95+ Performance, 100 A11y, 95+ SEO. Phase B.6+B.9 trebalo bi već da rade ovo. | 1h |
| S4-7 | Image optimization audit — sve PNG/JPG → WebP/AVIF, hero <200KB, gallery slike <100KB svaka | 1h |
| S4-8 | Bundle size audit — `npm run build` output, target First Load JS <250KB na home | 30 min |

**Exit criteria**: Plausible/GA4 + Sentry + UptimeRobot all wired, Lighthouse 95+/100/95+, bundle <250KB.

---

### Sprint 5 — Accessibility + cross-browser (~3h)

| # | Task | Effort |
|---|---|---|
| S5-1 | WCAG AA contrast audit — sve text-on-bg parove preko brand palete | 1.5h |
| S5-2 | Keyboard navigation pass — Tab kroz sve flow-ove, focus-visible, skip-to-content link, modal ESC, focus trap | 1.5h |
| S5-3 | Screen reader smoke — NVDA desktop + VoiceOver iOS na key flow-ovima | 1h |
| S5-4 | Browser matrix — Chrome, Firefox, Safari, Edge (desktop) + iOS Safari + Android Chrome. Booking, walk-in, shop checkout, admin login, lang toggle. | 2h |
| S5-5 | iOS PWA test — install prompt, splash, status bar, safe-area, back-swipe | 30 min |
| S5-6 | Android PWA test — install prompt, manifest | 30 min |
| S5-7 | Service Worker HTML cache test — admin edit `site_content` → reload home stable cache → vidi novo? Ako ne, SW patch | 30 min |

**Exit criteria**: WCAG AA pass, keyboard accessible end-to-end, all 6 browser/OS combos OK, PWA installable.

---

### Sprint 6 — Admin V1 polish + deferred items (~3h)

**Goal**: Address gallery upload errors (L10) + selected V1 admin improvements.

| ID | Item | V1? | Effort |
|---|---|---|---|
| L10 | Galerija silent upload errors — surface to admin | DA | 1h |
| G9 | CSV export za bookings/orders | Možda — Trišin/Stefan accountant će tražiti posle 2 nedelje | 1.5h |
| G11 | Push notifications za admin (web push, VAPID) | Stefan odluka — težak feature, fallback je iCal feed (G6) | 4h (po potrebi V1.1) |
| L13 | session.email u More sheet | Ne (by design) | — |
| **B.7** | i18n route-level locale | **Stefan odluka A/B/C** — preporuka **B** (post-launch V1.1) | 6-10h ako A |

**Exit criteria**: L10 fixed; G9/G11/B.7 odluke donete; ostatak parking-uje za V1.1.

---

### Sprint 7 — Content + visual final pass (~3h)

| # | Task | Effort | Stefan/Triša? |
|---|---|---|---|
| S7-1 | Final gallery upload — 8-12 high-quality fotki radnje + frizura preko admin galerije | Triša | Triša |
| S7-2 | Service ikone consistency — 11 servisa ima ikone? Vizuelno usaglasiti | 1h | — |
| S7-3 | Final SR copy edit — sva sr-Cyrl + sr-Latn parova proverena (admin/email/PWA install prompt) | 2h | Stefan review |
| S7-4 | Hero + section copy review post-Phase-B (B.8 deferred — možda mini-pass na hero) | 1h | Stefan |
| S7-5 | OG slike per-rute (1200×630): home, /zakazivanje, /shop. PDP već ima (auto iz `product.image_url`). Canva ili art helper. | 1.5h | Stefan delivery |

**Exit criteria**: Sva user-facing copy clean, gallery napunjena, OG slike per-rute live.

---

### Sprint 8 — Final QA + handover docs (~4h)

| # | Task | Effort |
|---|---|---|
| S8-1 | Full lifecycle Playwright test — booking SR + LAT, walk-in admin, pickup-ready flow, order completion. Headless. | 2h |
| S8-2 | Load test — 50 concurrent booking attempts (Artillery ili k6), Supabase ne pukne | 1h |
| S8-3 | Release checklist `docs/release-checklist.md` — 50+ stavki kao final go/no-go gate | 1h |
| S8-4 | Rollback plan `docs/rollback-runbook.md` — Vercel instant rollback, kako se vraća prethodni deploy | 30 min |
| S8-5 | Admin user guide `docs/admin-handover-guide.md` — kako Triša koristi admin sa screenshotima, SR | 3h |
| S8-6 | Content owner guide `docs/content-owner-guide.md` — kako se menja hero/banner/prices/galerija | 1.5h |
| S8-7 | Operacioni runbook `docs/operations-runbook.md` — incident response, ko se zove, gde su credentials | 1h |
| S8-8 | Credential transfer paket — premesti sve passwords/tokens u password manager (1Password/Bitwarden) za client | Stefan |

**Exit criteria**: Full lifecycle test passes, checklist complete, all 4 docs handed over.

---

## Stefan plug-in moment (~30-45 min totalno)

Kad domain + IG + GBP + (opciono FB/TT/X/LI) stignu:

1. **Vercel dashboard**: dodaj custom domain (auto SSL Let's Encrypt) — 10 min
2. **Vercel env**: update `NEXT_PUBLIC_SITE_URL=https://<domain>` (production + preview scope) — 5 min
3. **Resend dashboard**: verifikuj domain (DNS TXT + DKIM + SPF + DMARC) — 15 min DNS propagation
4. **Resend env**: update `RESEND_FROM=noreply@<domain>` — 5 min
5. **Admin panel** `/admin/podesavanja → DRUŠTVENE`: Stefan/Triša unose URL-ove i čekiraju enabled za platforme koje žele — 10 min
6. **Code env update** (jednom): `NEXT_PUBLIC_GBP_URL=<gbp>` u Vercel-u — 2 min
7. **Re-deploy** (Vercel "Redeploy") — 2 min build + 30 sec deploy
8. **Smoke test** — 8 ruta + footer ikone + JSON-LD `sameAs` — 5 min

---

### Sprint 9 — Phase C SEO re-audit (~1.5h, NAKON deploy-a)

| # | Task | Effort |
|---|---|---|
| S9-1 | Re-run technical-seo-checker na prod URL — target 47 → 80+ | 30 min |
| S9-2 | Re-run geo-platform-optimizer — target 33 → 55+ avg | 30 min |
| S9-3 | Re-run citability_scorer.py — target 16.7 → 60+ avg (samo ako je B.8 copy rewrite urađen, inače ostane ~16.7) | 15 min |
| S9-4 | PageSpeed Insights — LCP <2.5s, INP <200ms, CLS <0.1 (sad konačno na prod URL-u) | 15 min |
| S9-5 | Generiši `docs/seo/audit-2026-MM-DD-phase-c-comparison.md` — pre/posle skorovi, diff, deferred analysis | 30 min |

**Exit criteria**: Phase C report u `docs/seo/`, sve skorove uporedjene sa Phase A baseline-om.

---

## Post-launch (V1.1, mesec dana posle)

| # | Item | Effort |
|---|---|---|
| V1.1-1 | B.8 content rewrites (citability) — 5 blokova rewrite-a + B.5-FAQ + B.5-Review schema. Treba SR copywriter. | 4h + copy |
| V1.1-2 | B.7 i18n route-level locale (`/sr-Cyrl/...` + `/sr-Latn/...` + hreflang) — ako Stefan izabere A | 6-10h |
| V1.1-3 | CSP report-only mode — 1 nedelja audit, pa enforce | 4h spread |
| V1.1-4 | Admin deferred (M13, M14, L6, L12, G4, G7, G8, G10, G12, G13) | varies |
| V1.1-5 | Reddit/r/Beograd seeding (Perplexity citation lift) | Stefan |
| V1.1-6 | Bing Webmaster Tools + IndexNow API | 30 min |
| V1.1-7 | aggregateRating JSON-LD — kad bude verifikabilan izvor (GBP API) | 1h |

---

## Effort total

| Sprint | Effort | Stefan blokera? |
|---|---|---|
| 1 — Social links + push | ~2.5h | Ne |
| 2 — Production infra | ~3h | Ne (priprema) |
| 3 — Email + legal + content | ~4h | Stefan: imprint data |
| 4 — Analytics + monitoring + perf | ~4h | Ne |
| 5 — A11y + cross-browser | ~3h | Ne |
| 6 — Admin polish | ~3h | B.7 odluka |
| 7 — Content final | ~3h | Stefan + Triša photos/copy |
| 8 — QA + handover docs | ~4h | Ne |
| **Plug-in** | ~45 min | DA — domain, IG, GBP |
| 9 — Phase C re-audit | ~1.5h | Posle deploy-a |
| **TOTAL pre Stefan inputa** | **~26.5h** | razbijeno u 6-8 sesija |
| **TOTAL plug-in + final** | **~2.5h** | jedna sesija |

---

## Order of execution rationale

- **Sprint 1 prvo** jer otključava admin self-service za social linkove, nije blocked na Stefanu.
- **Sprint 2 odmah posle** jer preview deploy je preduslov za sve dalje (smoke testovi, Lighthouse na realnom URL-u, link share).
- **Sprintovi 3-7 paralelno-ish** — različite oblasti (legal/email/observability/perf/content), mogu da idu redom kako Stefan prioritizuje.
- **Sprint 8 (QA) na kraju** — full lifecycle ima smisla samo kad je sve ostalo zaključano.
- **Plug-in moment** — minimalan kontakt sa Stefan-ovim deliverable-ima, prebacuje sve u prod.
- **Sprint 9 (Phase C)** — verifikacioni layer, daje ti konačan SEO score broj za handover.

---

## Decisions still owed by Stefan

1. **Production domain** — koji TLD?
2. **Supabase tier** — free vs Pro $25/mo
3. **Plausible vs GA4** — preporuka Plausible (GDPR, no cookie banner needed za njega)
4. **B.7 i18n** — A/B/C
5. **G11 push notifications** — V1 ili V1.1?
6. **G9 CSV export** — V1 ili V1.1?
7. **Gallery photos** — Triša upload kroz admin pre launch-a
8. **Imprint legal data** — pravni naziv, adresa, PIB, MB
9. **Privacy/Terms review** — Stefan prolazi kroz copy ili angažuje pravnika?

---

## Update protocol

Posle svakog sprinta:
1. Update `## State` na vrhu
2. Strikethrough završene taskove (ne briši — istorija)
3. Dodaj nove discovered taskove kao podtaskovi
4. Commit ovog doc-a u istom commit-u sa sprintom: `docs(release): Sprint N closeout`
