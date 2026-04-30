---
name: Email deliverability — Resend domain setup
description: DNS records Stefan needs to add when domain arrives so transactional emails (booking confirmation, order ready) land in inbox not spam. Used at plug-in moment.
type: runbook
date: 2026-04-30
---

# Email deliverability — Resend domain setup

When the production domain lands, Resend needs to verify the domain before
emails will send `from: noreply@<domain>` (or whatever sender we pick).
Without verification, emails keep going from `onboarding@resend.dev` —
works, but recipient inboxes show that address as the sender, which looks
unprofessional and risks spam-folder routing.

## Sender address — pick one

Recommend one of these for `RESEND_FROM_EMAIL`:

| Address | Why |
|---|---|
| `noreply@<domain>` | Standard for transactional. Replies bounce. |
| `obavestenja@<domain>` | SR-friendly equivalent. Clearer to local users. |
| `pozdrav@<domain>` | Branded, warmer. Replies go to Stefan's inbox if mailbox forwards. |

Pick at plug-in time. Stefan can change later — just update Vercel env +
redeploy.

## DNS records to add

Resend gives 4 records when you click **Add Domain** in their dashboard.
The exact values come from Resend (per-account), but the shapes are:

### 1. Domain verification (TXT)

```
Type:    TXT
Name:    _resend
Value:   resend-verify=<token-from-resend>
TTL:     3600
```

### 2. DKIM (TXT)

```
Type:    TXT
Name:    resend._domainkey
Value:   k=rsa;p=<long-base64-key-from-resend>
TTL:     3600
```

DKIM cryptographically signs outgoing emails so recipients can verify the
mail actually came from a server authorized for the domain. Without it,
Gmail / iCloud / Outlook will route → spam.

### 3. SPF (TXT)

```
Type:    TXT
Name:    @  (or the apex domain)
Value:   v=spf1 include:_spf.resend.com ~all
TTL:     3600
```

If the registrar already has an SPF record for the domain (e.g. from
Google Workspace), MERGE the includes — don't add a second SPF record.
Two SPF records on the same domain = both invalid. Result:

```
v=spf1 include:_spf.google.com include:_spf.resend.com ~all
```

### 4. DMARC (TXT) — recommended

```
Type:    TXT
Name:    _dmarc
Value:   v=DMARC1; p=quarantine; rua=mailto:berbernicatrisa@gmail.com
TTL:     3600
```

DMARC tells receivers what to do with unauthenticated mail (quarantine =
send to spam folder). The `rua` address gets daily aggregate reports —
Stefan should glance at first week then can ignore.

Start with `p=none` for the first 14 days if you want to monitor without
risk, then upgrade to `p=quarantine`. `p=reject` is the strictest setting
but is overkill for a barbershop.

## Verification flow

1. Add Domain in Resend → copy the 4 records
2. Add to registrar DNS panel
3. Wait 15-30 min DNS propagation (`dig _resend.<domain> TXT` to check)
4. Click **Verify** in Resend → should turn green within seconds once DNS is live
5. Update `RESEND_FROM_EMAIL` in Vercel → Redeploy
6. Send a test booking from `/zakazivanje` — check that confirmation email
   arrives from new sender address, not from `onboarding@resend.dev`

## Spam check post-launch

Send a test email to `mail-tester.com` (or use Gmail Postmaster Tools if
Stefan has Workspace) — score 8+/10 means clean. Common gotchas:

- SPF flat record lookup limit (10 includes max — won't be a problem here)
- DKIM key copy-paste broke (test with Gmail "Show original" → check
  `dkim=pass`)
- Missing PTR / reverse DNS — Resend handles this on their side, not ours

## When verification fails

| Symptom | Likely cause | Fix |
|---|---|---|
| Resend dashboard shows "Pending" >30 min | DNS not propagated yet | wait + retry |
| `dig` returns NXDOMAIN | typo in record name | check trailing dots, exact `_resend` vs `resend._domainkey` |
| Verified but emails in spam | DMARC too strict for warm-up | start with `p=none`, upgrade after 14 days clean |
| "Domain not authorized" error in Resend logs | env not redeployed | double-check `RESEND_FROM_EMAIL` updated in Vercel + new deployment promoted |

## Existing fallback

Until verification is done, code keeps using `onboarding@resend.dev`:

- Emails still send (Resend's shared sender)
- Land in inbox most of the time but no domain branding
- Stefan can pre-launch test the booking flow this way
- Acceptable bridge state, not a launch blocker
