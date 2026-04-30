---
name: Trisha — Domain plug-in checklist
description: Step-by-step procedure for the day Stefan delivers the production domain. Self-contained — all the URLs, env vars, and DNS records the launch needs.
type: runbook
date: 2026-04-30
target-time: ≤ 45 minutes
---

# Domain plug-in — launch day procedure

This runbook fires the moment Stefan supplies the production domain. Everything else (Vercel project, env vars, JSON-LD, sitemap, robots, llms.txt, social-link plumbing, Resend account) is already in place — this just rewires the URL.

**Pre-condition**: Sprint 1-7 complete, app deployed to Vercel preview URL, smoke-tested. Master plan §"Plug-in moment".

---

## 1. DNS (Stefan, ~10 min + propagation)

Set on the domain registrar's DNS console. Vercel will auto-issue a Let's Encrypt cert as soon as records are correct.

| Record | Name | Value | TTL |
|---|---|---|---|
| `A` | `@` (apex) | `76.76.21.21` | 300 |
| `CNAME` | `www` | `cname.vercel-dns.com` | 300 |

If the registrar doesn't allow CNAME on apex, use Vercel's `ALIAS` or stick with `A`. Some Serbian registrars (RNIDS-side `.rs` registrars in particular) only support A/CNAME — that's fine.

DNS propagation: 5-30 minutes typically. Check with `dig <domain>` from a third-party network or `https://dnschecker.org`.

---

## 2. Vercel — add custom domain (~5 min)

1. Vercel dashboard → `trisha` project → **Settings → Domains**
2. **Add Domain** → enter `<domain>` (no protocol, no slash)
3. Add `www.<domain>` too if Stefan wants both. Vercel auto-redirects www→apex (or vice versa) based on which one you set as primary.
4. Wait for "Valid Configuration" badge. SSL cert auto-issues within 1-2 minutes after DNS check.

---

## 3. Update environment variables (~5 min)

Vercel dashboard → `trisha` → **Settings → Environment Variables**

| Variable | Old (preview) | New (production + preview) |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<preview>.vercel.app` | `https://<domain>` |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` | `noreply@<domain>` (only after step 4 below) |
| `NEXT_PUBLIC_GBP_URL` | (unset) | `<gbp-public-url>` if Stefan delivered |

**IMPORTANT**: env var changes only take effect on next deploy. After saving, click **Deployments → ⋯ → Redeploy** on the latest production deployment.

---

## 4. Resend — verify domain (~15 min DNS propagation)

Without this, emails will keep going `from: onboarding@resend.dev` — works, but recipient inbox shows that as the sender.

1. Resend dashboard → **Domains → Add Domain** → `<domain>`
2. Resend gives 4 DNS records (TXT for verification + DKIM, SPF TXT, DMARC TXT)
3. Stefan adds them in registrar DNS panel
4. Click **Verify** in Resend after ~15 min — wait for green badge
5. Update `RESEND_FROM_EMAIL` env in Vercel to `noreply@<domain>` (or whatever sender address Stefan prefers — `obavestenja@<domain>` is more brand-friendly in SR)
6. Redeploy on Vercel so the new env propagates

---

## 5. Admin: paste social URLs (~5 min)

1. Stefan / Triša logs into `https://<domain>/admin/login` (PIN `1234`)
2. **PODEŠAVANJA → DRUŠTVENE** tab
3. For each platform Stefan wants visible:
   - check "enabled"
   - paste the full profile URL
   - click SAČUVAJ
4. Verify footer ikone appear at `https://<domain>/`
5. Verify gallery section IG CTA reappears (only Instagram triggers that one)

---

## 6. Final smoke (~5 min)

```bash
DOMAIN="https://<domain>"
curl -s -o /dev/null -w "%{http_code} home\n" "$DOMAIN/"
curl -s -o /dev/null -w "%{http_code} book\n" "$DOMAIN/zakazivanje"
curl -s -o /dev/null -w "%{http_code} shop\n" "$DOMAIN/shop"
curl -s -o /dev/null -w "%{http_code} PDP\n"  "$DOMAIN/shop/pomada-batajnica"
curl -s -o /dev/null -w "%{http_code} robots\n"  "$DOMAIN/robots.txt"
curl -s -o /dev/null -w "%{http_code} sitemap\n" "$DOMAIN/sitemap.xml"
curl -s -o /dev/null -w "%{http_code} llms\n"    "$DOMAIN/llms.txt"

# Verify HTTPS + HSTS
curl -sI "$DOMAIN/" | grep -iE "strict-transport-security|x-frame|x-content"

# Verify sameAs in JSON-LD reflects new URLs
curl -s "$DOMAIN/" | grep -o '"sameAs":\[[^]]*\]'
```

Expected: all 200, HSTS header present (Vercel auto-adds on prod HTTPS), sameAs contains every enabled social URL + GBP if set.

---

## 7. SEO Phase C re-audit (~1.5h, separate session)

Once `<domain>` is live and stable, run Phase C from `docs/release-master-plan-2026-04-30.md` Sprint 10. Compare against Phase A baseline in `docs/seo/audit-2026-04-29-phase-a-*.md`.

---

## 8. Imprint update (~5 min)

Stefan supplies legal data with domain (per locked decision §8 in `project_trisha_release_state_2026_04_30.md`). Drop into:
- `web/src/components/site-footer.tsx` — visible imprint block (or wherever it landed in Sprint 3)
- `web/src/app/uslovi-koriscenja/page.tsx` — Terms of Service legal entity reference
- `web/src/app/privatnost/page.tsx` — Privacy Policy data controller

Re-deploy.

---

## Rollback

If anything breaks immediately after the env swap:

1. Vercel dashboard → **Deployments** → previous "Ready" deployment → **Promote to Production**
2. Takes ~30 seconds, no DB rollback needed (env-only change)
3. Investigate failure; new env values are safe to leave set, just promote forward when fixed

DNS rollback is harder — if you accidentally point DNS at the wrong target, propagation takes 5-30 min to undo. So **double-check DNS values before saving**.

---

## Estimated total

DNS edit: 5 min
DNS propagation: 5-30 min (passive)
Vercel domain: 5 min
Env update + redeploy: 7 min
Resend domain + DNS: 5 min edit + 15 min propagation
Admin URL paste: 5 min
Smoke test: 5 min
Imprint update: 5 min

**Active work: ~30-35 min. Wall-clock: ~45 min including DNS waits.**
