# Берберница Триша

PWA web-sajt + booking sistem + shop + mobile admin za tradicionalnu berbernicu u Batajnici.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **DB + Auth:** Supabase (PostgreSQL + RLS)
- **Email:** Resend
- **Hosting:** Vercel (production), localhost:3050 (dev)
- **PWA:** next-pwa

## Folder structure

```
Berbernica/
├── README.md                ← ovaj fajl
├── .gitignore
├── .env.local.example       ← template, popuni i sačuvaj kao .env.local
│
├── docs/                    ← projektna dokumentacija
│   ├── TRISHA_CONTEXT.md    ← potpun kontekst projekta (design + spec)
│   └── DESIGN_BRIEF.md      ← original brief od claude.ai/design
│
├── design/                  ← handoff bundle iz claude.ai/design
│   ├── README.md            ← claude.ai uputstvo coding agentu
│   ├── prototypes/          ← HTML prototipi (4 stranice)
│   ├── screenshots/         ← hero varijante
│   ├── photos/              ← Trišine prave fotografije
│   ├── refs/                ← design reference (Gemini, pasted)
│   └── full-design.pdf      ← kompletna design dokumentacija (3.2MB)
│
├── web/                     ← Next.js aplikacija (TBD)
├── supabase/                ← migracije + seed skripte
│   └── migrations/
└── scripts/                 ← utility skripte
```

## Setup (lokalno)

1. Kopiraj env template:
   ```bash
   cp .env.local.example .env.local
   ```
2. Popuni `.env.local` realnim ključevima (Supabase, Resend).
3. Install i pokreni:
   ```bash
   cd web
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
