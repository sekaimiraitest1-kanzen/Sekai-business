---
name: Trisha — Free tier monitoring strategy
description: How we keep the site within Supabase Free tier limits + when to upgrade to Pro. Concrete thresholds and weekly check protocol.
type: runbook
date: 2026-04-30
---

# Free tier monitoring — Trisha

Stefan locked Free tier for V1. This is the playbook that keeps us under the caps and catches drift before it bites.

---

## Supabase Free tier ceilings (2026 values)

| Resource | Free cap | Pro cap | Cost to upgrade |
|---|---|---|---|
| Database size | **500 MB** | 8 GB | $25/mo |
| Storage size | **1 GB** | 100 GB | included |
| Storage egress (bandwidth) | **5 GB / month** | 250 GB | included |
| API egress | included in 5 GB | 250 GB | included |
| Active project sleep | **after 7 days inactivity** | never | — |
| Auto-backups | none | daily, 7-day retention | included |
| Realtime concurrent connections | 200 | 500+ | — |

**The "project sleep after 7 days inactivity"** is silent and brutal — first request after sleep gets a 500 + 30-second cold start. UptimeRobot ping every 5 minutes prevents this (one of the reasons UptimeRobot is in the plan).

---

## Hard limits we built into the code

| Where | Limit | Reason |
|---|---|---|
| `web/src/lib/storage/upload.ts` | `MAX_BYTES = 2MB` | Caps any single image at 2MB after client-side WebP compression. Typical output 200-800KB. |
| `web/src/lib/storage/compress-client.ts` | 2000px max edge, q=0.82 WebP | Keeps gallery photos under ~600KB despite phone-camera input |
| `.github/workflows/db-backup.yml` | nightly pg_dump → 90-day artifact | No reliance on Supabase Pro auto-backup |

---

## Weekly check protocol (Stefan, 5 min, every Monday)

1. **Supabase dashboard → Reports** (https://supabase.com/dashboard/project/ljxovmahbyxgyyttvldv/reports)
   - DB size: should grow by ≤ 5 MB/week. **Alert if > 100 MB total.**
   - Storage: should grow only when admin uploads. **Alert if > 600 MB.**
   - Egress: rolls over monthly. **Alert if > 60% by mid-month** (= projected 4+ GB by month-end).

2. **GitHub Actions → Database backup** workflow
   - Should have green run every day. Click into latest, verify artifact exists.
   - Download last week's artifact occasionally to test restore procedure.

3. **UptimeRobot (or whatever uptime tool we settled on)**
   - Verify last ping < 5 min ago. Verify uptime > 99.5%.

4. **Plausible dashboard**
   - Pageviews trend. Sudden traffic spike (10×) = check Supabase egress same day.

---

## Auto-alerts wired up

| Alert source | Channel | Threshold |
|---|---|---|
| Supabase email alerts | `berbernicatrisa@gmail.com` | 80% on any of (DB size, storage, egress, MAU) |
| GitHub Actions failure | `berbernicatrisa@gmail.com` (default) | backup workflow fails |
| UptimeRobot | `berbernicatrisa@gmail.com` | site returns non-200 for ≥ 2 min |
| Vercel deploy failures | `berbernicatrisa@gmail.com` | build / deploy fails |

**Configure Supabase alerts**: dashboard → Settings → Notifications → Email → check all 4 categories at 80%.

---

## When to upgrade to Pro ($25/mo)

Trigger upgrade **immediately** if any of:

1. **DB size > 400 MB** (80% of 500 MB cap) — usually means orders/bookings table grew faster than expected. Pro gives 8 GB headroom.
2. **Storage > 800 MB** — Triša added many high-res photos. Pro gives 100 GB.
3. **Egress > 4 GB by day 20 of the month** — projected month-end > 5 GB. Two consecutive months over → upgrade.
4. **Project went to sleep** twice in a row — UptimeRobot pings aren't enough to keep it active (means traffic so low Supabase considers it dormant). Pro removes the inactivity sleep.
5. **Auto-backups required** by client / business — Pro includes daily auto-backups with 7-day retention. We have GitHub Actions as fallback but Pro is more robust.

**Don't upgrade pre-emptively** unless Stefan's revenue projections justify it — Free tier is genuinely sufficient for a single-location barbershop with ≤ 2K bookings/month and ≤ 50K monthly visitors.

---

## What we deliberately did NOT do

- **Cloudflare R2 / Backblaze B2 image hosting** — would shift Storage egress off Supabase. Adds complexity (CDN setup, signed URLs, CORS) for a problem we don't have yet. Revisit V1.1 if egress hits 70%.
- **External Postgres** (Neon, Crunchy) — Supabase Free is generous; switching means rewiring auth, RLS, Realtime. Not worth it unless DB actively choking.
- **Image transform CDN** (Imgix, Cloudinary) — same reasoning. Vercel's built-in Next/Image with Supabase Storage URLs handles transforms within Vercel's bandwidth (which IS unlimited on Vercel Hobby).

---

## Vercel Hobby tier sanity (separate from Supabase)

| Resource | Vercel Hobby cap | Risk |
|---|---|---|
| Bandwidth | 100 GB / month | low — we proxy Supabase Storage, so Vercel sees all egress |
| Function invocations | 100 GB-hours | low — App Router is mostly static + RSC streaming |
| Build minutes | 6000 / month | low — 2-3 min per build |
| Deployments | unlimited | — |

If Vercel Hobby becomes the bottleneck instead of Supabase, switch to **Vercel Pro $20/mo** before Supabase Pro — usually Vercel hits limits first on traffic-heavy sites because everything proxies through it.

---

## Quick-reference thresholds card

```
SAFE      WARNING   CRITICAL
DB        <300MB    300-400MB    >400MB    → upgrade
Storage   <600MB    600-800MB    >800MB    → upgrade
Egress    <3GB      3-4GB        >4GB/mo   → upgrade after 2nd month
Sleep     never     once         twice     → upgrade
```
