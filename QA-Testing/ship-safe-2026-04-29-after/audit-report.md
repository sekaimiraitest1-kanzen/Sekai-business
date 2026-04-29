
# Ship Safe Security Report

**Score: 66.1/100 (C)** — Fix before shipping

> Generated: 2026-04-29T16:28:25.068Z

## Category Breakdown

| Category | Issues | Deduction |
|----------|--------|-----------|
| Secrets | 3 | -15 |
| Code Vulnerabilities | 0 | -0 |
| Dependencies | 0 | -0 |
| Auth & Access Control | 0 | -0 |
| Configuration | 8 | -8 |
| Supply Chain | 0 | -0 |
| API Security | 9 | -10 |
| AI/LLM Security | 1 | -0.8999999999999999 |

## High (14)

| File | Rule | Description | Fix |
|------|------|-------------|-----|
| QA-Testing/ship-safe-2026-04-29/release-readiness-plan.md:0 | GIT_HISTORY_SECRET | Secret was removed from code but still exists in git history (commit f1632b4811, | Rotate this credential immediately, then clean history: npx  |
| web/package-lock.json:0 | GIT_HISTORY_SECRET | Secret found in current code AND in git history (commit 557c7089ac). | Remove from code, rotate the credential, then clean git hist |
| web/src/app/admin/(app)/galerija/actions.ts:18 | API_UPLOAD_NO_TYPE_CHECK | File upload using original filename without type validation. | Validate file extension and MIME type. Generate random filen |
| web/src/app/admin/(app)/galerija/actions.ts:20 | API_UPLOAD_NO_TYPE_CHECK | File upload using original filename without type validation. | Validate file extension and MIME type. Generate random filen |
| web/src/app/admin/(app)/galerija/galerija-client.tsx:69 | API_UPLOAD_NO_TYPE_CHECK | File upload using original filename without type validation. | Validate file extension and MIME type. Generate random filen |
| web/src/app/admin/(app)/galerija/galerija-client.tsx:70 | API_UPLOAD_NO_TYPE_CHECK | File upload using original filename without type validation. | Validate file extension and MIME type. Generate random filen |
| web/src/app/admin/(app)/shop/proizvodi/actions.ts:70 | API_UPLOAD_NO_TYPE_CHECK | File upload using original filename without type validation. | Validate file extension and MIME type. Generate random filen |
| web/src/app/admin/(app)/shop/proizvodi/actions.ts:73 | API_UPLOAD_NO_TYPE_CHECK | File upload using original filename without type validation. | Validate file extension and MIME type. Generate random filen |
| web/src/app/admin/(app)/shop/proizvodi/proizvodi-client.tsx:115 | API_UPLOAD_NO_TYPE_CHECK | File upload using original filename without type validation. | Validate file extension and MIME type. Generate random filen |
| web/src/app/admin/(app)/shop/proizvodi/proizvodi-client.tsx:116 | API_UPLOAD_NO_TYPE_CHECK | File upload using original filename without type validation. | Validate file extension and MIME type. Generate random filen |
| web/scripts/seed-admin.mjs:52 | PII_IN_CONSOLE_LOG | PII fields logged to console. Log output may be stored in log aggregation servic | Remove PII from log statements. Use structured logging with  |
| web/scripts/seed-admin.mjs:89 | PII_IN_CONSOLE_LOG | PII fields logged to console. Log output may be stored in log aggregation servic | Remove PII from log statements. Use structured logging with  |
| web/src/app/shop/actions.ts:92 | PII_IN_CONSOLE_LOG | PII fields logged to console. Log output may be stored in log aggregation servic | Remove PII from log statements. Use structured logging with  |
| web/src/app/zakazivanje/actions.ts:118 | PII_IN_CONSOLE_LOG | PII fields logged to console. Log output may be stored in log aggregation servic | Remove PII from log statements. Use structured logging with  |

## Medium (7)

| File | Rule | Description | Fix |
|------|------|-------------|-----|
| QA-Testing/ship-safe-2026-04-29/release-readiness-plan.md:12 | Password Assignment | Hardcoded passwords are a critical vulnerability. | Move to environment variable or secrets manager |
| web/src/lib/supabase/server.ts:0 | API_NO_RATE_LIMIT | HTTP server detected without any rate-limiting library. APIs without rate limits | Add rate limiting: npm i express-rate-limit && app.use(rateL |
| web/scripts/seed-admin.mjs:60 | RAG_SYSTEM_DOCS_WITH_USER_DOCS | System/internal documents mixed with user documents in the same collection. User | Separate system documents from user documents in different c |
| web/scripts/seed-admin.mjs:27 | PII_EMAIL_HARDCODED | Real email address hardcoded in source code (not @example.com). May be PII or a  | Use @example.com for test emails. Store real emails in envir |
| web/src/app/page.tsx:377 | PII_EMAIL_HARDCODED | Real email address hardcoded in source code (not @example.com). May be PII or a  | Use @example.com for test emails. Store real emails in envir |
| web/src/components/site-footer.tsx:59 | PII_EMAIL_HARDCODED | Real email address hardcoded in source code (not @example.com). May be PII or a  | Use @example.com for test emails. Store real emails in envir |
| web/src/lib/email/client.ts:12 | PII_EMAIL_HARDCODED | Real email address hardcoded in source code (not @example.com). May be PII or a  | Use @example.com for test emails. Store real emails in envir |

