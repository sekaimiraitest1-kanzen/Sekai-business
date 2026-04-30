---
name: SEO Phase B → next session handoff
description: Self-contained brief for the next Claude session. Covers Stefan inputs (domain, IG, FB, GBP, X, TikTok, LinkedIn), social_links migration that's sitting uncommitted in working tree, and Phase C verification. NO ASSUMPTIONS — read this end-to-end before touching code.
type: handoff
date: 2026-04-30
authored-by: previous-claude-session
prerequisite-reads:
  - docs/seo/phase-b-completion-2026-04-30.md (what's already shipped)
  - docs/seo/phase-b-pickup-2026-04-30.md (original Phase B plan)
  - docs/seo/audit-2026-04-29-phase-a-1-technical.md (technical baseline)
  - docs/seo/audit-2026-04-29-phase-a-2-platform.md (cross-platform baseline)
---

# Trisha — Next Session Handoff

> **READ FIRST.** This document tells you (the next Claude session) exactly what's done, what to do, in what order, and what to NOT do. Stefan won't be re-explaining context. The previous session was Opus 4.7, ran 2026-04-30 EOD, and shipped 11 commits between `5e82ef3` and `4d018b7` on `main`.

---

## 0. Repo state at handoff

```
cwd:    /home/kaizenlinux/Projects/Luka_Projects/LukaPr_Trisha/Berbernica
branch: main
HEAD:   4d018b7  ("docs(seo): Phase B completion report 2026-04-30")
dev:    cd web && npm run dev → http://localhost:3050
build:  cd web && npm run build  (PASSES — verify before any commit)
tsc:    cd web && npx tsc --noEmit  (PASSES)
remote: not pushed yet (verify with `git log origin/main..HEAD` once you have remote credentials)
```

**Working tree (one untracked file, do NOT delete):**

```
?? supabase/migrations/005_social_links.sql
```

This was created at `21:43` on 2026-04-30 during the previous session — but **NOT** by the previous Claude session. Likely Stefan or another tool created it. It's complete, idempotent, and adds a `social_links` JSONB column to `salons`. **You will commit this in §3 below — but only AFTER reviewing the migration content first** (§3.1).

---

## 1. Stefan's inputs (the reason you exist)

Stefan is delivering these tomorrow (2026-05-01) per the release-state memory. **Confirm exact values with Stefan when this session starts** — don't guess from prior context, and don't proceed without all required values:

| Input | Required for | Where it goes | Format expected |
|---|---|---|---|
| **Production domain** | `NEXT_PUBLIC_SITE_URL` env var | Vercel project env (Production scope) | `https://<domain>` (no trailing slash). Examples likely: `berbernica.rs`, `trisha.rs`, `berbernicatrisa.com` |
| **Instagram URL** | `social_links.instagram.url` + `sameAs[]` + homepage gallery link | Admin `/admin/podesavanja` (after you build the UI in §4) AND `web/src/app/page.tsx:325` (placeholder `https://instagram.com/`) | Full URL `https://instagram.com/<handle>` |
| **Facebook page URL** *(optional)* | `social_links.facebook.url` + `sameAs[]` | Same as IG | `https://facebook.com/<page>` |
| **Google Business Profile URL** *(high leverage)* | `sameAs[]` only — GBP is not a `social_links` platform | `web/src/lib/seo/local-business.ts` `sameAs[]` directly | `https://maps.google.com/?cid=<id>` or `https://g.page/<handle>` |
| **TikTok URL** *(optional)* | `social_links.tiktok.url` + `sameAs[]` | Same as IG | `https://tiktok.com/@<handle>` |
| **LinkedIn URL** *(rare for barbershop)* | `social_links.linkedin.url` + `sameAs[]` | Same as IG | `https://linkedin.com/company/<slug>` |
| **X/Twitter URL** *(optional)* | `social_links.x.url` + `sameAs[]` | Same as IG | `https://x.com/<handle>` |

If Stefan only provides a subset (e.g. just IG + GBP), that's fine — the schema and `sameAs[]` only emit enabled platforms. Do not invent placeholder URLs to fill gaps.

---

## 2. Order of operations (DO IN THIS ORDER)

The dependencies cascade — getting the order wrong wastes a deploy:

1. **§3 — Commit `005_social_links.sql` migration**
2. **§4 — Build admin UI for `social_links` in `/admin/podesavanja`**
3. **§5 — Wire footer + homepage to read `social_links` and render icons**
4. **§6 — Stefan delivers URLs → write them via admin UI**
5. **§7 — Wire `sameAs[]` in `local-business.ts` (reads from `salons.social_links` + accepts GBP separately)**
6. **§8 — Replace homepage IG placeholder (`page.tsx:325`)**
7. **§9 — Set `NEXT_PUBLIC_SITE_URL` on Vercel + first preview deploy**
8. **§10 — Push commits to origin**
9. **§11 — Production deploy**
10. **§12 — Phase C verification re-audit on prod URL**

§4–5 can ship **before** Stefan delivers URLs (table starts empty, footer renders nothing — safe). §6 requires the URLs.

---

## 3. Commit the migration

### 3.1 Verify before committing

Read `supabase/migrations/005_social_links.sql` end-to-end. Expected shape (was true at handoff):

```sql
ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{...}'::jsonb;
UPDATE salons SET social_links = jsonb_build_object(...);
```

Idempotent (`IF NOT EXISTS` + `COALESCE` backfill). If the file's been modified since handoff or doesn't match this shape, **stop and ask Stefan** before committing.

### 3.2 Apply to Supabase

Migrations in `supabase/migrations/` are applied via `supabase db push` or via the Supabase Studio "run SQL" surface. Confirm with Stefan whether prior migrations (`001`–`004`) ran via CLI or Studio, and follow the same path. Do not bypass that pipeline.

After apply, confirm column exists:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'salons' AND column_name = 'social_links';
```

### 3.3 Commit

```bash
git add supabase/migrations/005_social_links.sql
git commit -m "feat(db): salons.social_links JSONB for admin-managed sameAs"
```

Suggested message body should explain the shape (5 platforms × {enabled, url}) and the rationale (toggle visibility independently from URL ownership; admin can pre-fill before go-live).

---

## 4. Admin UI — `/admin/podesavanja`

Current state (verified at handoff):

```
web/src/app/admin/(app)/podesavanja/
├── actions.ts                    (announcements CRUD + iCal token)
├── page.tsx                      (loads site_announcements, passes icalUrl)
└── podesavanja-client.tsx        (renders both)
```

The page has **no social_links surface yet**. You will add one.

### 4.1 What to add

In `page.tsx`: load `salons.social_links` for the current admin's salon and pass to client.

```ts
// in PodesavanjaPage()
const { data: salon } = await sb
  .from("salons")
  .select("id, social_links")
  .eq("id", session.salonId)
  .single();
// pass salon.social_links to PodesavanjaClient
```

In `actions.ts`: new server action `updateSocialLinks(salonId, links)`. Validate the shape strictly (5 keys, each `{enabled: boolean, url: string}`), reject anything else with a clear error. Use the admin client (`createAdminClient` — already imported) so RLS doesn't block the write. Don't trust the URL string blindly — validate it's `https://` and matches the platform's host (`instagram.com`, `facebook.com`, etc.) to prevent admin XSS via attribute injection if a URL leaks into `<a href>` raw.

In `podesavanja-client.tsx`: a section "Социјалне мреже / Društvene mreže" with 5 rows — one per platform — each with:
- a `<input type="checkbox">` for `enabled`
- an `<input type="url">` for `url`
- a small platform name label (Instagram, Facebook, TikTok, LinkedIn, X)
- save-on-blur or a single "Sačuvaj" button (match existing announcements UX in the same file)

The dual-script (sr-Cyrl/sr-Latn) toggle pattern in admin uses the same `data-sr` / `data-lat` spans found elsewhere in the admin shell. Stay consistent.

### 4.2 Type the social_links shape

Add a shared type in `web/src/lib/types/social.ts`:

```ts
export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "linkedin" | "x";

export type SocialLinks = Record<SocialPlatform, { enabled: boolean; url: string }>;

export const EMPTY_SOCIAL_LINKS: SocialLinks = {
  instagram: { enabled: false, url: "" },
  facebook: { enabled: false, url: "" },
  tiktok: { enabled: false, url: "" },
  linkedin: { enabled: false, url: "" },
  x: { enabled: false, url: "" },
};
```

Reuse this in admin form, footer, and `local-business.ts`. Do not duplicate the union literal across files.

### 4.3 Sanity gate

```bash
cd web && npx tsc --noEmit && npm run build
```

Then manually click through `/admin/podesavanja`, save a single platform with a real URL, and re-load to confirm persistence.

---

## 5. Public-site rendering — footer + homepage

### 5.1 Footer icons

Edit `web/src/components/site-footer.tsx`. Currently it has 4 grid columns (brand, navigacija, kontakt, radno vreme) and a `footer-bottom`. Add a 5th column or a row inside the brand column for social icons. Render only platforms where `enabled === true && url !== ""`. Use accessible markup:

```tsx
<a
  href={links.instagram.url}
  aria-label="Instagram — Berbernica Triša"
  target="_blank"
  rel="me noopener noreferrer"
>
  <InstagramIcon />
</a>
```

`rel="me"` is important for IndieWeb / verifiable identity (Google's KG and Mastodon both honor it). `noopener noreferrer` is standard for cross-origin links.

For icons: SVG inline is simplest. Don't pull a heavy icon library for 5 icons. Use `<svg>` blocks. Style via CSS to inherit color from the footer palette (`var(--mustard)` is a likely candidate — verify in `web/src/styles/legacy.css`).

To get `salons.social_links` into the footer, the footer is rendered from `web/src/app/page.tsx` (and other root layouts) — pass `socialLinks` prop down from the page that already loads `salon`. Currently `page.tsx` selects `name, address, phone, email, working_hours` from `salons` — extend the select to include `social_links` and pass through.

The same pattern applies to other places that render `<SiteFooter>`. Grep for `SiteFooter` to find them all (likely just `page.tsx` and a `not-found.tsx` if one exists).

### 5.2 Homepage Instagram gallery link

`web/src/app/page.tsx:325` currently:

```tsx
<a href="https://instagram.com/" ...>
```

Change to read from the loaded salon's `social_links.instagram.url` and only render the `<a>` wrapper if `enabled && url`. If disabled, render the same text without the link wrapper (or remove the row entirely — match the existing CSS layout, don't break the gallery header).

### 5.3 Sanity gate

`npm run build`, then `curl http://localhost:3050/ | grep instagram` and verify the `<a href>` matches Stefan's URL.

---

## 6. Apply Stefan's URLs

This is the only step that must wait for Stefan. Once he delivers them:

1. Open `/admin/podesavanja` in a logged-in admin session.
2. For each platform with a URL: tick `enabled`, paste URL, save.
3. Verify on `/` that the footer renders only those platforms.
4. Verify the homepage IG link in the gallery header matches.

Do NOT hardcode URLs in source files. They live in `salons.social_links` so the salon owner can change them without a deploy.

**Special case — GBP**: GBP is not a `social_links` platform (5 fixed slots above don't include it). GBP URL goes directly into `local-business.ts` `sameAs[]` — see §7. Reasoning: GBP is the canonical entity-resolution signal for ChatGPT and Gemini KG, and we want the URL hardcoded in the LocalBusiness JSON-LD even if there's no UI surface for it. If/when a 6th `social_links` slot makes sense, that's a v2 conversation.

---

## 7. Wire `sameAs[]` in `local-business.ts`

Current state of `web/src/lib/seo/local-business.ts:112`:

```ts
// TODO(B.2): populate sameAs once Instagram URL is fixed and GBP/Facebook URLs collected.
// TODO(B.x): populate aggregateRating from GBP API or a verified source. Not safe to hardcode.
```

### 7.1 Extend the input type

```ts
type SalonInput = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  workingHours?: WorkingHours | null;
  socialLinks?: SocialLinks | null;   // ← new
  gbpUrl?: string | null;             // ← new (separate, not in social_links)
};
```

### 7.2 Build the `sameAs` array

```ts
const sameAs: string[] = [];
if (salon.socialLinks) {
  for (const platform of ["instagram", "facebook", "tiktok", "linkedin", "x"] as const) {
    const entry = salon.socialLinks[platform];
    if (entry?.enabled && entry.url) sameAs.push(entry.url);
  }
}
if (salon.gbpUrl) sameAs.push(salon.gbpUrl);
```

### 7.3 Spread into the JSON-LD return

```ts
return {
  ...,
  ...(sameAs.length > 0 ? { sameAs } : {}),
};
```

Empty array should be omitted entirely — schema.org tolerates missing `sameAs` but a present-but-empty array is a soft anti-pattern AIO crawlers may downweight.

Remove the `TODO(B.2)` comment once landed. Leave the `aggregateRating` TODO — that's still deferred until verifiable source.

### 7.4 Pass through from the page

In `web/src/app/page.tsx`, the call to `buildLocalBusinessJsonLd({ salon: { ... }, ... })` needs the new fields:

```ts
buildLocalBusinessJsonLd({
  salon: {
    ...,
    socialLinks: salon?.social_links ?? null,
    gbpUrl: process.env.NEXT_PUBLIC_GBP_URL ?? null,  // see 7.5
  },
  services: ...,
  siteUrl,
});
```

### 7.5 Where does the GBP URL live?

Two options — pick one and document it:

**Option A (recommended):** Hardcode in `web/src/lib/seo/local-business.ts` as `const GBP_URL = "..."` constant, since it changes ~never and isn't admin-editable. Simpler.

**Option B:** Add `NEXT_PUBLIC_GBP_URL` env var on Vercel. Slightly more flexible. Forces re-deploy to change.

Stefan's instinct probably prefers (A). Confirm before implementing.

### 7.6 Sanity gate

```bash
cd web && npm run build
# then in dev:
curl -s http://localhost:3050/ | grep -oE '"sameAs":\[[^]]*\]'
```

Expected output: a JSON array containing every URL Stefan provided.

---

## 8. Homepage IG placeholder cleanup

Already covered in §5.2. Once §6 is done and the admin UI writes Stefan's IG URL into `social_links`, the placeholder at `web/src/app/page.tsx:325` should already be reading from `salon.social_links.instagram.url`. Verify with `grep -n "instagram.com/" web/src/app/page.tsx` — there should be **zero hardcoded** matches after this section.

---

## 9. Vercel env + first preview

1. **Set env vars on Vercel** (Production + Preview scopes):
   - `NEXT_PUBLIC_SITE_URL` = `https://<stefan-domain>` (no trailing slash)
   - All existing Supabase env vars copy from `.env.local` if not already set
   - If you went with §7.5 Option B: `NEXT_PUBLIC_GBP_URL`
2. **Deploy a preview** (push branch or use `vercel deploy` from CLI).
3. **Smoke-test all 7 endpoints** on the preview URL:
   - `/robots.txt` — should now have prod domain in `Host:` and `Sitemap:`
   - `/sitemap.xml` — all URLs use prod domain
   - `/llms.txt` — all `{{BASE}}` substitutions resolve to prod domain
   - `/` — verify `metadataBase` URL is correct via `<meta property="og:url">` and `<link rel="canonical">`
   - `/zakazivanje`, `/shop`, `/shop/<any-slug>` — same
   - JSON-LD `@id`, `url`, and `sameAs` should all use prod domain

Verification skill scripts available in `~/.claude/skills/geo-seo/scripts/` (use `~/.claude/skills/geo-seo/.venv/bin/python3`):

```bash
~/.claude/skills/geo-seo/.venv/bin/python3 ~/.claude/skills/geo-seo/scripts/citability_scorer.py https://<prod-domain>/
~/.claude/skills/geo-seo/.venv/bin/python3 ~/.claude/skills/geo-seo/scripts/llmstxt_generator.py --validate https://<prod-domain>/llms.txt
```

---

## 10. Push to origin

The previous session **did not push**. There are 11 local commits ahead of `origin/main` (verify with `git log origin/main..HEAD --oneline`).

```bash
git push origin main
```

If the remote rejects (CI on push, branch protection), follow the existing PR workflow — there's no project convention against direct push to main per the prior commit history, but verify with Stefan if uncertain.

---

## 11. Production deploy

Standard Vercel "promote to production" flow on the deployment that smoke-tested green in §9. Stefan will own the click. After promotion:

1. Verify HTTPS is live and HSTS header is auto-added by Vercel:
   ```bash
   curl -sI https://<prod-domain>/ | grep -i strict-transport-security
   ```
2. Submit `https://<prod-domain>/sitemap.xml` to Google Search Console + Bing Webmaster Tools (Stefan needs to claim those properties first).
3. Confirm `/robots.txt` is fetchable by Googlebot — if Stefan claims GSC, the "URL Inspection" tool will tell you immediately.

---

## 12. Phase C — verification re-audit

Phase C measures the lift from Phase B. Targets per the audit baselines:

| Metric | Phase A baseline | Phase C target |
|---|---|---|
| A.1 Technical SEO | 47/100 | 75–80 |
| A.1 Security sub-score | 0/15 | ~10/15 (CSP still pending) |
| A.2 Platform readiness avg | 33/100 | 55–60 |
| A.2 ChatGPT readiness | mid-30s | 55+ (sameAs lift) |
| A.3 Citability avg | 16.7/100 | ~16.7 (unchanged — B.8 deferred) |
| llms.txt | 404 | 200 |

Tools (all installed at `~/.claude/agents/geo-*.md` and `~/.claude/skills/geo-seo/`):

```
geo-technical              ← A.1 technical re-audit
geo-platform-analysis      ← A.2 cross-platform re-audit
geo-content                ← A.3 content / citability (will still be low — B.8 deferred)
geo-schema                 ← validates the JSON-LD I shipped
geo-ai-visibility          ← AI crawler / llms.txt / brand mentions
```

Run each agent on `https://<prod-domain>` and capture output. Generate the comparison report:

```
docs/seo/audit-2026-MM-DD-phase-c-comparison.md
```

The report should:
1. Reference the Phase A audits by filename
2. Show side-by-side scores (before / after)
3. Flag any regression (unexpected — but confirm)
4. List remaining gaps that should be next priority (likely: B.8 content, B.7 i18n, CSP, AggregateRating)

Update memory:
- Replace `seo_phase_b_complete.md` reference with a new `seo_phase_c_complete.md`
- Update `MEMORY.md` index

---

## 13. What NOT to do

- ❌ **Don't** start B.7 i18n route-level locale refactor without Stefan's explicit go-ahead (memory `seo_i18n_strategy.md` documents Option X as target, but it's a 6–10h drastic refactor — wait for V1.1 conversation).
- ❌ **Don't** hardcode an `aggregateRating` JSON-LD value. Even if Stefan eyeballs his Google reviews — schema.org says the value must be from a verifiable source (GBP API, scraped + reviewed). Hardcoding is a manual-action risk.
- ❌ **Don't** ship a strict `Content-Security-Policy` without first running it in `Content-Security-Policy-Report-Only` mode for ≥1 week. The footer / Google Fonts bootstrap / Supabase Storage origin / any embedded third-party widget can all be silently broken by a strict CSP.
- ❌ **Don't** rewrite content (B.8) without SR copywriter input. The dual-script (sr-Cyrl + sr-Latn) constraint means any rewrite must be authored in both — not just translated by you. Wait for Stefan's content session.
- ❌ **Don't** generate per-route OG images programmatically (B.3) — Stefan may want art-directed images. Wait for that conversation.
- ❌ **Don't** delete or modify `supabase/migrations/005_social_links.sql` without checking with Stefan — even though it appeared "from nowhere" in the previous session's working tree, it's well-structured and looks intentional. Treat as Stefan's draft.
- ❌ **Don't** push to `origin/main` if Stefan asks you to PR-flow it instead. The prior commits were direct-to-main but this is a release-critical session.

---

## 14. Quick reference — file map

```
SEO infrastructure (don't change without reason):
  web/src/app/robots.ts                      ← AI bot policy
  web/src/app/sitemap.ts                     ← URLs from Supabase products
  web/src/app/llms.txt/route.ts              ← AI agent guide
  web/src/lib/seo/local-business.ts          ← LocalBusiness + HairSalon JSON-LD ★ §7 edits here
  web/src/lib/seo/product.ts                 ← Product + Offer
  web/src/lib/seo/item-list.ts               ← /shop ItemList
  web/src/lib/seo/breadcrumbs.ts             ← BreadcrumbList builder
  web/src/lib/seo/service.ts                 ← /zakazivanje Service[]
  web/src/lib/phone.ts                       ← E.164 normalizer
  web/src/components/json-ld.tsx             ← <script type="application/ld+json"> wrapper

Per-route metadata (don't change titles without copy review):
  web/src/app/layout.tsx                     ← root metadata + viewport
  web/src/app/page.tsx                       ← homepage + LocalBusiness inject ★ §5.2 + §7.4 edits here
  web/src/app/zakazivanje/page.tsx           ← booking metadata + Service JSON-LD
  web/src/app/zakazivanje/booking-flow.tsx   ← sr-only <h1>
  web/src/app/shop/page.tsx                  ← shop metadata + ItemList JSON-LD
  web/src/app/shop/[slug]/page.tsx           ← PDP metadata + Product JSON-LD

Where Stefan's URLs flow:
  Admin form   ★ §4 (build new):
    web/src/app/admin/(app)/podesavanja/page.tsx
    web/src/app/admin/(app)/podesavanja/podesavanja-client.tsx
    web/src/app/admin/(app)/podesavanja/actions.ts
    + new: web/src/lib/types/social.ts

  DB layer   ★ §3 (commit + apply):
    supabase/migrations/005_social_links.sql

  Public render   ★ §5 (build new):
    web/src/components/site-footer.tsx        (social icons row)
    web/src/app/page.tsx:325                  (gallery IG link)

  JSON-LD   ★ §7 (wire in):
    web/src/lib/seo/local-business.ts:112     (sameAs from social_links + GBP)
```

---

## 15. End-state acceptance criteria

You're done when ALL of these are true:

- [ ] `005_social_links.sql` committed + applied to Supabase prod DB
- [ ] `/admin/podesavanja` has working social_links UI; round-trip (save + reload) verified
- [ ] Stefan's URLs are in `salons.social_links` for the trisa salon row
- [ ] Footer renders icons for enabled platforms only
- [ ] Homepage gallery IG link reads from `social_links` (not hardcoded)
- [ ] `local-business.ts` emits `sameAs[]` containing Stefan's URLs + GBP
- [ ] `NEXT_PUBLIC_SITE_URL` set on Vercel; preview build of all endpoints passes smoke test
- [ ] Production deploy promoted; HSTS verified live
- [ ] Phase C comparison report at `docs/seo/audit-2026-MM-DD-phase-c-comparison.md`
- [ ] `MEMORY.md` updated to point to Phase C completion (retire phase-b-complete pointer)
- [ ] All commits pushed to `origin/main`

If any box is unchecked at session end, document the blocker in a fresh handoff doc (`phase-c-pickup-2026-MM-DD.md`) and update `MEMORY.md`.

---

## 16. Contact

Stefan's email: `stefans.malinovic@gmail.com` (per global memory).
He's the only stakeholder. There's no team rotation — when in doubt, ask him directly. Don't ship pre-launch SEO/JSON-LD changes on assumption.
