# Берберница Триша

PWA web-sajt + booking sistem + shop + mobile admin za tradicionalnu berbernicu u Batajnici.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind + custom CSS in `web/src/styles/`
- **DB + Auth:** Supabase (PostgreSQL + RLS)
- **Email:** Resend
- **PWA:** hand-rolled service worker (`web/public/sw.js`)
- **Hosting:** Vercel (production), localhost:3050 (dev)

## Folder structure

```
Berbernica/
├── README.md
├── .gitignore
│
├── web/                     ← Next.js application (canonical source)
│   ├── public/              ← static assets, manifest.json, sw.js, icons
│   ├── src/                 ← app/ (routes), components/, lib/, styles/
│   ├── scripts/             ← seed-admin.mjs (one-time bootstrap)
│   └── package.json
│
├── supabase/                ← database migrations
│   └── migrations/
│
└── docs/                    ← project documentation
    ├── TRISHA_CONTEXT.md    ← full project context (design + spec)
    └── DESIGN_BRIEF.md      ← original brief from claude.ai/design
```

Reference assets (design prototypes, photos, audit reports from earlier
sessions) are preserved outside the repo at
`../deprecated/Berbernica-cleanup-2026-04-29/` — out of GitHub but on disk.

## Setup (lokalno)

1. Kopiraj env template iz `web/`:
   ```bash
   cd web
   cp .env.local.example .env.local
   ```
2. Popuni `.env.local` realnim ključevima (Supabase, Resend).
3. Install i pokreni:
   ```bash
   npm install
   npm run dev
   ```
4. Otvori http://localhost:3050

## Servisi

| Servis | URL | Namena |
|--------|-----|--------|
| GitHub | https://github.com/BerbernicaTrisa/Berbernica | Source repo (private) |
| Supabase | https://supabase.com/dashboard/project/ljxovmahbyxgyyttvldv | DB + Auth |
| Vercel | (kreira se pred release) | Hosting |
| Resend | https://resend.com | Email |

## Status

🚧 **U razvoju.** Faza: bootstrap Next.js aplikacije.

Vidi `docs/TRISHA_CONTEXT.md` za kompletan plan i `docs/DESIGN_BRIEF.md` za design specifikaciju.
