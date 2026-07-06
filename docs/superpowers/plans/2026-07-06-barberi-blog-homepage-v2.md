# Barberi (booking-by-barber) + Blog CMS + Homepage v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the new "Barbershop Vuk - Site.dc.html" homepage design (hero carousel, ghost-watermark sections, "pick your barber" section, blog section), backed by two real features the old homepage didn't need: per-barber slot filtering in the booking flow, and a real blog CMS.

**Architecture:** Reuse the existing `admin_users` (staff/login) table for barber public profiles instead of a parallel `barbers` table — `bookings.staff_id` already FKs there for admin attribution, so extending the same row with public-facing fields (photo, bio, specialty) keeps "the person the customer picked" and "the person who did the cut" as the same identity by construction. A new `bookings.barber_id` column (distinct from the existing `staff_id`) records the customer's choice at booking time and is what slot-availability filters on; `staff_id` keeps its existing job (admin claims a booking with a DONE stamp, for earnings attribution) untouched. A new `blog_posts` table + admin CRUD + `/blog` routes follow the exact pattern already used for `site_announcements` / `products`. The homepage (`src/app/page.tsx`) is rebuilt section-by-section against the new design, keeping the existing bilingual (`data-sr`/`data-lat`) + Supabase-parallel-fetch pattern.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS), plain CSS (`legacy.css` family — already re-themed to Anton/Space Grotesk/red-cream-black in the prior session), no new dependencies.

## Global Constraints

- All new/changed public copy is Serbian Latin (`data-lat`) + English (`data-sr`), matching every existing section — never ship one language only.
- No new npm dependencies. No rich-text editor for blog — plain textarea, rendered as paragraphs split on blank lines (matches the codebase's existing "no CMS framework" philosophy).
- Every admin server action starts with `requireAdmin()` (or `requireOwner()` if owner-only) exactly like every existing `actions.ts` in `src/app/admin/(app)/*` — never trust client-supplied `salon_id`.
- Buttons/cards/inputs stay square (no `border-radius`) — matches the existing design system, do not introduce rounded corners.
- Every migration file must be idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`) — this codebase's convention, verified across all 13 existing migrations.
- `bookings.staff_id` (existing, post-hoc admin attribution) and `bookings.barber_id` (new, customer's choice at booking time) are different columns with different write times — do not conflate them or reuse one for the other.
- Barber photos upload to the existing **`gallery`** storage bucket (public read) — the `avatars` bucket is private and not worth reconfiguring for this.
- The `/admin/berberi` screen only **edits public-profile fields** on existing active `admin_users` rows (photo, bio, specialty, role title, show-on-site, sort order). It must NOT create/delete staff accounts or touch PINs — that's `/admin/podesavanja`'s job (`createStaff`/`resetStaffPin`/`toggleStaffActive`/`softDeleteStaff` in `src/app/admin/(app)/podesavanja/actions.ts`, already built). Keep the two screens' responsibilities separate.

---

## File Structure

**New files:**
- `supabase/migrations/014_barber_profiles.sql` — public profile columns on `admin_users` + `public_barbers` view + `bookings.barber_id`
- `supabase/migrations/015_blog_posts.sql` — `blog_posts` table + RLS
- `src/app/admin/(app)/berberi/actions.ts` — read/update public barber profile fields
- `src/app/admin/(app)/berberi/berberi-client.tsx` — edit form + reorder (mirrors `galerija-client.tsx`)
- `src/app/admin/(app)/berberi/page.tsx` — server wrapper
- `src/app/admin/(app)/blog/actions.ts` — CRUD for `blog_posts` (mirrors `usluge/actions.ts`)
- `src/app/admin/(app)/blog/blog-client.tsx` — list + inline editor
- `src/app/admin/(app)/blog/page.tsx` — server wrapper
- `src/app/blog/page.tsx` — public blog index
- `src/app/blog/[slug]/page.tsx` — public post detail (mirrors `shop/[slug]/page.tsx`)
- `src/lib/seo/blog.ts` — `buildArticleJsonLd`
- `src/app/hero-carousel.tsx` — small client component for the rotating hero headline (the rest of `page.tsx` stays a server component)

**Modified files:**
- `src/lib/booking/slots.ts` — no signature change (pure math already barber-agnostic)
- `src/app/zakazivanje/actions.ts` — `submitBooking` gains required `barberId`; `getTakenSlots` gains optional `barberId` filter
- `src/app/zakazivanje/booking-flow.tsx` — new Step 1 "choose a barber", steps 2-6 shift, `?barber=` query param preselect
- `src/app/zakazivanje/page.tsx` — fetch `public_barbers`, read `?barber=` search param
- `src/app/page.tsx` — full section rebuild (hero carousel, onama, usluge icon-tiles, tim/radno vreme band, berberi, galerija, blog teaser, cta, footer — utisci/lokacija sections removed from homepage)
- `src/components/site-nav.tsx` — new logo mark + nav links (POČETNA/O NAMA/USLUGE/GALERIJA/BLOG/KONTAKT)
- `src/components/site-footer.tsx` — 3-column layout + newsletter field
- `src/app/admin/(app)/_shell/admin-shell.tsx` — add "Berberi" + "Blog" to `MORE_OWNER` + `titleMap`
- `src/styles/legacy.css` — new classes for ghost watermark, skewed icon tiles, hero carousel, barber cards, blog cards, newsletter footer

---

## Phase A — Barber directory + booking-by-barber

### Task A1: Migration — barber profile fields + public view + `bookings.barber_id`

**Files:**
- Create: `supabase/migrations/014_barber_profiles.sql`

**Interfaces:**
- Produces: `public_barbers` view with columns `id, salon_id, display_name, photo_url, bio_sr, bio_lat, specialty_sr, specialty_lat, role_title_sr, role_title_lat, public_sort_order` — every later task (admin screen, homepage, booking flow) reads/writes these exact names.
- Produces: `bookings.barber_id UUID` (nullable, FK → `admin_users(id)`)

- [ ] **Step 1: Write the migration**

```sql
-- Migration 014: barber public profiles + booking-by-barber
-- Idempotent — safe to re-run.
--
-- Reuses admin_users (the existing staff/login table) for barber public
-- profiles instead of a parallel table: bookings.staff_id already FKs here
-- for post-hoc admin attribution, so "the barber a customer picks" and
-- "the person who did the cut" stay the same identity by construction.
-- Only rows with show_on_site=true are ever exposed publicly, via the
-- public_barbers view below — admin_users itself keeps its existing
-- restrictive RLS (it holds pin_hash + email).

-- ─── 1. Public profile columns ──────────────────────────────────────────
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS bio_sr TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS bio_lat TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS specialty_sr TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS specialty_lat TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role_title_sr TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role_title_lat TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS show_on_site BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS public_sort_order INTEGER NOT NULL DEFAULT 0;

-- ─── 2. Public-safe view ─────────────────────────────────────────────────
-- Views default to running as their OWNER (ownership chaining), not the
-- querying role — this is what lets an anon-granted view read through a
-- table whose RLS would otherwise block anon entirely. We rely on that
-- default explicitly here. Only ever add SAFE columns to this SELECT list —
-- never pin_hash, email, phone, first_name/last_name, failed_pin_attempts.
CREATE OR REPLACE VIEW public_barbers WITH (security_invoker = false) AS
  SELECT
    id,
    salon_id,
    display_name,
    photo_url,
    bio_sr,
    bio_lat,
    specialty_sr,
    specialty_lat,
    role_title_sr,
    role_title_lat,
    public_sort_order
  FROM admin_users
  WHERE show_on_site = true
    AND is_active = true
    AND deleted_at IS NULL;

GRANT SELECT ON public_barbers TO anon, authenticated;

-- ─── 3. Booking → barber selection (set by the customer at booking time) ─
-- Distinct from staff_id (migration 007), which is set LATER when an admin
-- claims the booking with a DONE stamp for earnings attribution — the two
-- can legitimately differ (e.g. Marko is out sick, Vuk covers his booking:
-- barber_id stays Marko, staff_id becomes Vuk).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_id UUID
  REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_barber_idx ON bookings(salon_id, barber_id, date);
```

- [ ] **Step 2: Apply the migration**

Run against the Supabase project (via the SQL editor in the Supabase dashboard, or `psql`/`supabase db push` if the project uses the CLI — check `supabase/config.toml` for the project ref first). Verify with:

```sql
select column_name from information_schema.columns where table_name = 'admin_users' and column_name in ('photo_url','show_on_site','public_sort_order');
select * from public_barbers; -- should return 0 rows (nobody opted in yet), not an error
select column_name from information_schema.columns where table_name = 'bookings' and column_name = 'barber_id';
```

Expected: all three queries succeed with no error; `public_barbers` returns an empty result set (0 rows), not a permission error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/014_barber_profiles.sql
git commit -m "Add barber public-profile columns, public_barbers view, bookings.barber_id"
```

---

### Task A2: Admin screen — `/admin/berberi` (edit public profile on existing staff)

**Files:**
- Create: `src/app/admin/(app)/berberi/actions.ts`
- Create: `src/app/admin/(app)/berberi/berberi-client.tsx`
- Create: `src/app/admin/(app)/berberi/page.tsx`
- Modify: `src/app/admin/(app)/_shell/admin-shell.tsx`

**Interfaces:**
- Consumes: `requireOwner()` from `src/lib/auth/with-admin.ts`; `createAdminClient()` from `src/lib/supabase/admin`; `uploadImage`/`deleteFromStorage` from `src/lib/storage/upload.ts` (bucket `"gallery"`); `compressToWebP` from `src/lib/storage/compress-client.ts`.
- Produces: `getBarberProfiles()`, `updateBarberProfile(id, patch)`, `reorderBarbers(idsInOrder)` — used only by `berberi-client.tsx`.

- [ ] **Step 1: Server actions**

```typescript
// src/app/admin/(app)/berberi/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/auth/with-admin";
import { uploadImage, deleteFromStorage } from "@/lib/storage/upload";
import { pathFromUrl } from "@/lib/storage/url";

export type BarberProfile = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  bio_sr: string | null;
  bio_lat: string | null;
  specialty_sr: string | null;
  specialty_lat: string | null;
  role_title_sr: string | null;
  role_title_lat: string | null;
  show_on_site: boolean;
  public_sort_order: number;
};

// Every currently-employed staff member (owner + staff), regardless of
// show_on_site — the owner needs to see everyone here to decide who to
// turn ON, not just who's already public.
export async function getBarberProfiles(): Promise<BarberProfile[]> {
  const session = await requireOwner();
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("admin_users")
    .select("id, display_name, photo_url, bio_sr, bio_lat, specialty_sr, specialty_lat, role_title_sr, role_title_lat, show_on_site, public_sort_order")
    .eq("salon_id", session.salonId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("public_sort_order", { ascending: true });
  if (error || !data) return [];
  return data as BarberProfile[];
}

export async function updateBarberProfile(
  id: string,
  patch: Partial<Pick<BarberProfile, "bio_sr" | "bio_lat" | "specialty_sr" | "specialty_lat" | "role_title_sr" | "role_title_lat" | "show_on_site">>
) {
  const session = await requireOwner();
  const sb = createAdminClient();
  await sb.from("admin_users").update(patch).eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/berberi");
  revalidatePath("/");
  revalidatePath("/zakazivanje");
  return { ok: true as const };
}

export async function uploadBarberPhoto(id: string, formData: FormData) {
  const session = await requireOwner();
  const file = formData.get("file");
  const filename = formData.get("filename");
  if (!(file instanceof Blob)) return { ok: false as const, error: "MISSING_FILE" };
  if (typeof filename !== "string" || !filename) return { ok: false as const, error: "MISSING_FILENAME" };

  const sb = createAdminClient();
  const { data: existing } = await sb.from("admin_users").select("photo_url").eq("id", id).eq("salon_id", session.salonId).maybeSingle();

  const upload = await uploadImage("gallery", file, filename);
  if (!upload.ok) return { ok: false as const, error: upload.error };

  await sb.from("admin_users").update({ photo_url: upload.url }).eq("id", id).eq("salon_id", session.salonId);

  // Best-effort cleanup of the previous photo — not fatal if it fails.
  if (existing?.photo_url) {
    const path = pathFromUrl(existing.photo_url, "gallery");
    if (path) await deleteFromStorage("gallery", path);
  }

  revalidatePath("/admin/berberi");
  revalidatePath("/");
  revalidatePath("/zakazivanje");
  return { ok: true as const, url: upload.url };
}

export async function reorderBarbers(idsInOrder: string[]) {
  const session = await requireOwner();
  const sb = createAdminClient();
  await Promise.all(
    idsInOrder.map((id, idx) => sb.from("admin_users").update({ public_sort_order: idx }).eq("id", id).eq("salon_id", session.salonId))
  );
  revalidatePath("/admin/berberi");
  revalidatePath("/");
  return { ok: true as const };
}
```

- [ ] **Step 2: Page wrapper**

```tsx
// src/app/admin/(app)/berberi/page.tsx
import { getBarberProfiles } from "./actions";
import { BerberiClient } from "./berberi-client";

export default async function BerberiPage() {
  const barbers = await getBarberProfiles();
  return <BerberiClient barbers={barbers} />;
}
```

- [ ] **Step 3: Client screen**

```tsx
// src/app/admin/(app)/berberi/berberi-client.tsx
"use client";

import { useState, useTransition } from "react";
import { compressToWebP } from "@/lib/storage/compress-client";
import { updateBarberProfile, uploadBarberPhoto, type BarberProfile } from "./actions";

export function BerberiClient({ barbers: initial }: { barbers: BarberProfile[] }) {
  const [barbers, setBarbers] = useState(initial);
  const [editing, setEditing] = useState<BarberProfile | null>(null);
  const [pending, start] = useTransition();

  function patchLocal(id: string, patch: Partial<BarberProfile>) {
    setBarbers((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>БЕРБЕРИ</span>
            <span data-lat>BERBERI</span>
          </div>
          <div className="adm-page-subtitle">{barbers.length} zaposlenih</div>
        </div>
      </div>

      {barbers.length === 0 && (
        <div className="adm-empty">
          <span data-sr>Нема запослених. Додај их у Подешавања.</span>
          <span data-lat>Nema zaposlenih. Dodaj ih u Podešavanja.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {barbers.map((b) => (
          <button
            key={b.id}
            type="button"
            className="adm-list-row"
            onClick={() => setEditing(b)}
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left" }}
          >
            <div style={{ width: 44, height: 44, flexShrink: 0, background: "var(--brown-900)", overflow: "hidden" }}>
              {b.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{b.display_name ?? "—"}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{b.role_title_lat ?? "—"}</div>
            </div>
            <span
              style={{
                fontSize: 10,
                letterSpacing: ".08em",
                padding: "3px 8px",
                background: b.show_on_site ? "var(--mustard)" : "transparent",
                border: b.show_on_site ? "none" : "1px solid rgba(239,233,221,.2)",
                color: b.show_on_site ? "var(--brown-950)" : "rgba(239,233,221,.5)",
              }}
            >
              {b.show_on_site ? "ONLINE" : "SAKRIVEN"}
            </span>
          </button>
        ))}
      </div>

      {editing && (
        <BarberEditor
          barber={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            patchLocal(editing.id, patch);
            start(async () => { await updateBarberProfile(editing.id, patch); });
          }}
          onUpload={async (file) => {
            const { blob, filename } = await compressToWebP(file);
            const fd = new FormData();
            fd.append("filename", filename);
            fd.append("file", blob, filename);
            const res = await uploadBarberPhoto(editing.id, fd);
            if (res.ok) patchLocal(editing.id, { photo_url: res.url });
          }}
        />
      )}
    </>
  );
}

function BarberEditor({
  barber,
  pending,
  onClose,
  onSave,
  onUpload,
}: {
  barber: BarberProfile;
  pending: boolean;
  onClose: () => void;
  onSave: (patch: Partial<BarberProfile>) => void;
  onUpload: (file: File) => void;
}) {
  const [roleTitleSr, setRoleTitleSr] = useState(barber.role_title_sr ?? "");
  const [roleTitleLat, setRoleTitleLat] = useState(barber.role_title_lat ?? "");
  const [specialtySr, setSpecialtySr] = useState(barber.specialty_sr ?? "");
  const [specialtyLat, setSpecialtyLat] = useState(barber.specialty_lat ?? "");
  const [bioSr, setBioSr] = useState(barber.bio_sr ?? "");
  const [bioLat, setBioLat] = useState(barber.bio_lat ?? "");
  const [showOnSite, setShowOnSite] = useState(barber.show_on_site);

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet">
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">{barber.display_name}</div>
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ width: "100%", height: 160, background: "var(--brown-900)", marginBottom: 12, overflow: "hidden" }}>
            {barber.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={barber.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} style={{ marginBottom: 16 }} />

          <label className="adm-form-label">TITULA (ćir.)</label>
          <input className="adm-input" value={roleTitleSr} onChange={(e) => setRoleTitleSr(e.target.value)} placeholder="OWNER · MASTER BARBER" style={{ marginBottom: 8 }} />
          <label className="adm-form-label">TITULA (lat.)</label>
          <input className="adm-input" value={roleTitleLat} onChange={(e) => setRoleTitleLat(e.target.value)} placeholder="VLASNIK · MASTER BARBER" style={{ marginBottom: 8 }} />

          <label className="adm-form-label">SPECIJALNOST — chip (ćir.)</label>
          <input className="adm-input" value={specialtySr} onChange={(e) => setSpecialtySr(e.target.value)} placeholder="FADE · BEARD" style={{ marginBottom: 8 }} />
          <label className="adm-form-label">SPECIJALNOST — chip (lat.)</label>
          <input className="adm-input" value={specialtyLat} onChange={(e) => setSpecialtyLat(e.target.value)} placeholder="FADE · BRADA" style={{ marginBottom: 8 }} />

          <label className="adm-form-label">BIO (ćir.)</label>
          <textarea className="adm-input" value={bioSr} onChange={(e) => setBioSr(e.target.value)} rows={3} style={{ marginBottom: 8 }} />
          <label className="adm-form-label">BIO (lat.)</label>
          <textarea className="adm-input" value={bioLat} onChange={(e) => setBioLat(e.target.value)} rows={3} style={{ marginBottom: 12 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={showOnSite} onChange={(e) => setShowOnSite(e.target.checked)} />
            <span data-sr>Прикажи на сајту (може се резервисати)</span>
            <span data-lat>Prikaži na sajtu (može se rezervisati)</span>
          </label>

          <button
            className="adm-btn adm-btn-block"
            disabled={pending}
            onClick={() => {
              onSave({
                role_title_sr: roleTitleSr,
                role_title_lat: roleTitleLat,
                specialty_sr: specialtySr,
                specialty_lat: specialtyLat,
                bio_sr: bioSr,
                bio_lat: bioLat,
                show_on_site: showOnSite,
              });
              onClose();
            }}
          >
            <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
          </button>
          <button className="adm-btn adm-btn-secondary adm-btn-block" style={{ marginTop: 8 }} onClick={onClose}>
            <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into admin nav**

In `src/app/admin/(app)/_shell/admin-shell.tsx`, add to `MORE_OWNER` (after the `galerija` entry) and to `titleMap`:

```typescript
const MORE_OWNER = [
  { href: "/admin/galerija", icon: "🖼", label_sr: "ГАЛЕРИЈА", label_lat: "GALERIJA" },
  { href: "/admin/berberi", icon: "💈", label_sr: "БЕРБЕРИ", label_lat: "BERBERI" },
  { href: "/admin/blog", icon: "📰", label_sr: "БЛОГ", label_lat: "BLOG" },
  { href: "/admin/sajt", icon: "📝", label_sr: "САЈТ", label_lat: "SAJT" },
  { href: "/admin/blokirano", icon: "🚫", label_sr: "БЛОКИРАНО", label_lat: "BLOKIRANO" },
  { href: "/admin/statistike", icon: "📊", label_sr: "СТАТИСТИКА", label_lat: "STATISTIKA" },
  { href: "/admin/podesavanja", icon: "⚙", label_sr: "ПОДЕШАВАЊА", label_lat: "PODEŠAVANJA" },
] as const;
```

```typescript
const titleMap: Record<string, { sr: string; lat: string }> = {
  // ...existing entries...
  "/admin/berberi": { sr: "БЕРБЕРИ", lat: "BERBERI" },
  "/admin/blog": { sr: "БЛОГ", lat: "BLOG" },
};
```

- [ ] **Step 5: Manual verification**

Run `npm run dev`, log into `/admin/login`, navigate to `/admin/berberi` (via the "VIŠE" sheet). Confirm the staff list renders, opening a row shows the editor sheet, toggling "Prikaži na sajtu" + saving persists after a page reload, and uploading a photo shows it immediately.

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/admin/(app)/berberi" "web/src/app/admin/(app)/_shell/admin-shell.tsx"
git commit -m "Add /admin/berberi — public barber profile editor over existing staff accounts"
```

---

### Task A3: Booking flow — barber selection filters slot availability

**Files:**
- Modify: `src/app/zakazivanje/actions.ts`
- Modify: `src/app/zakazivanje/booking-flow.tsx`
- Modify: `src/app/zakazivanje/page.tsx`

**Interfaces:**
- Consumes: `public_barbers` view (Task A1).
- Produces: `submitBooking` now requires `barberId: string` in `BookingInput`; `getTakenSlots(salonId, date, durationMin, barberId?)`.

- [ ] **Step 1: `getTakenSlots` — filter bookings by barber**

In `src/app/zakazivanje/actions.ts`, change the signature and the bookings query (blocked_slots stays salon-wide — a lunch break blocks every barber):

```typescript
export async function getTakenSlots(
  salonId: string,
  date: string,
  durationMin: number,
  barberId?: string,
): Promise<string[]> {
  if (!salonId || !date || durationMin <= 0) return [];
  const sb = createAdminClient();
  let bookingsQuery = sb
    .from("bookings")
    .select("time_slot, services!inner(duration_min)")
    .eq("salon_id", salonId)
    .eq("date", date)
    .in("status", ["pending", "confirmed"]);
  if (barberId) bookingsQuery = bookingsQuery.eq("barber_id", barberId);

  const [bookingsRes, blocksRes] = await Promise.all([
    bookingsQuery,
    sb
      .from("blocked_slots")
      .select("time_slot")
      .eq("salon_id", salonId)
      .eq("date", date),
  ]);

  // Whole-day block: every grid cell is unavailable, no overlap math needed.
  if ((blocksRes.data ?? []).some((r) => r.time_slot === null)) {
    const all: string[] = [];
    for (let h = 0; h < 24; h++) for (const m of ["00", "30"]) all.push(`${String(h).padStart(2, "0")}:${m}`);
    return all;
  }

  const busy: Range[] = [];
  for (const b of bookingsRes.data ?? []) {
    const ts = b.time_slot as string;
    const svc = (b as unknown as { services: { duration_min: number } | { duration_min: number }[] }).services;
    const dur = Array.isArray(svc) ? svc[0]?.duration_min : svc?.duration_min;
    if (typeof dur === "number") {
      busy.push({ startMin: toMinutes(ts.slice(0, 5)), durationMin: dur });
    }
  }
  for (const r of blocksRes.data ?? []) {
    if (r.time_slot) busy.push({ startMin: toMinutes((r.time_slot as string).slice(0, 5)), durationMin: 30 });
  }

  return Array.from(computeBlockedSlots(durationMin, busy));
}
```

- [ ] **Step 2: `submitBooking` — require `barberId`, filter the overlap check, store it**

Add `barberId` to `bookingSchema`:

```typescript
const bookingSchema = z.object({
  salonId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID format"),
  barberId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID format"),
  serviceId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID format"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().optional().transform((v) => v ?? ""),
  utmSource: z.string().optional(),
});
```

In the slot re-check block (step "2. Verify slot is still free"), scope the bookings query to the chosen barber:

```typescript
  const [{ data: dayBookings }, { data: dayBlocks }] = await Promise.all([
    sb
      .from("bookings")
      .select("id, time_slot, services!inner(duration_min)")
      .eq("salon_id", data.salonId)
      .eq("date", data.date)
      .eq("barber_id", data.barberId)
      .in("status", ["pending", "confirmed"]),
    sb
      .from("blocked_slots")
      .select("time_slot")
      .eq("salon_id", data.salonId)
      .eq("date", data.date),
  ]);
```

And add `barber_id` to the insert:

```typescript
  const { data: booking, error: bErr } = await sb
    .from("bookings")
    .insert({
      salon_id: data.salonId,
      customer_id: customerId,
      service_id: data.serviceId,
      barber_id: data.barberId,
      date: data.date,
      time_slot: data.timeSlot,
      status: "confirmed",
      utm_source: data.utmSource ?? "direct",
      surcharge_applied: surchargeApplied,
      is_loyalty_redeem: isLoyaltyRedeem,
    })
    .select("id")
    .single();
```

- [ ] **Step 3: `booking-flow.tsx` — new Step 1 "choose a barber"**

Add a `Barber` type, a `barberId` param + `initialBarberId` prop, shift the step union to `1 | 2 | 3 | 4 | 5 | 6`, and thread `barberId` into both `getTakenSlots` calls and `submitBooking`. Key edits (full new step-1 screen + the touched call sites):

```typescript
type Barber = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  role_title_sr: string | null;
  role_title_lat: string | null;
  specialty_sr: string | null;
  specialty_lat: string | null;
};
```

```typescript
export function BookingFlow({
  services,
  barbers,
  salonId,
  salonAddress,
  workingHours,
  initialBarberId,
}: {
  services: Service[];
  barbers: Barber[];
  salonId: string;
  salonAddress: string;
  workingHours: WorkingHours | null;
  initialBarberId?: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [barberId, setBarberId] = useState<string | null>(null);
  // ...existing state...

  // Deep-link from a homepage "Zakaži kod X" card: preselect the barber and
  // skip straight to service selection.
  useEffect(() => {
    if (initialBarberId && barbers.some((b) => b.id === initialBarberId)) {
      setBarberId(initialBarberId);
      setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Update both slot-fetch call sites to pass `barberId`:

```typescript
  useEffect(() => {
    if (!date || !selectedService || !barberId) {
      setTaken([]);
      return;
    }
    void getTakenSlots(salonId, date, selectedService.duration_min, barberId).then(setTaken);
  }, [date, salonId, selectedService, barberId]);
```

Update `handleSubmit` to include `barberId` (guard on it being set) and `go()`/`reset()` to include the new step count:

```typescript
  function handleSubmit() {
    if (!serviceId || !date || !time || !barberId) return;
    setSubmitErr(null);
    start(async () => {
      const res = await submitBooking({
        salonId,
        barberId,
        serviceId,
        date,
        timeSlot: time,
        name,
        phone,
        email,
        utmSource,
      });
      if (res.ok) {
        setBookingId(res.bookingId);
        const svc = services.find((s) => s.id === serviceId);
        trackEvent(EVENTS.BOOKING_COMPLETED, {
          service: svc?.name_lat ?? "unknown",
          price: svc?.price ?? 0,
          hasEmail: !!email,
        });
        go(6);
      } else {
        setSubmitErr(res.error);
      }
    });
  }
```

New Step 1 screen (insert before the existing `{step === 1 && (...)}` service-picker block, which becomes `step === 2`; renumber every subsequent `step === N` and `go(N)` call by +1 through the file, and change `ProgressBar`'s `steps` array to 6 entries: `BARBER/BERBERIN, SERVICE/USLUGA, DATE/DATUM, TIME/TERMIN, DETAILS/PODACI, CONFIRM/POTVRDA`):

```tsx
{step === 1 && (
  <div className="step-screen active">
    <div className="step-header">
      <div className="step-eyebrow" data-sr>STEP 1 OF 5</div>
      <div className="step-eyebrow" data-lat>KORAK 1 OD 5</div>
      <h2 className="step-title" data-sr>Choose your barber.</h2>
      <h2 className="step-title" data-lat>Izaberi majstora.</h2>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {barbers.map((b) => (
        <div
          key={b.id}
          className={`service-card ${barberId === b.id ? "selected" : ""}`}
          onClick={() => setBarberId(b.id)}
          style={{ gridTemplateColumns: "56px 1fr auto" }}
        >
          <div style={{ width: 56, height: 56, background: "var(--brown-900)", overflow: "hidden" }}>
            {b.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <div>
            <div className="service-card-name">{b.display_name}</div>
            <div className="service-card-meta" data-sr>{b.role_title_sr ?? ""}</div>
            <div className="service-card-meta" data-lat>{b.role_title_lat ?? ""}</div>
          </div>
          <div className="service-card-check">✓</div>
        </div>
      ))}
    </div>

    <div style={{ marginTop: 32 }}>
      <button className="bk-btn-primary" disabled={!barberId} onClick={() => go(2)}>
        <span data-sr>CONTINUE →</span>
        <span data-lat>NASTAVI →</span>
      </button>
    </div>
  </div>
)}
```

Change every remaining `step === 2` (was 1) through `step === 6` (was 5) block's condition and internal `go(N)`/eyebrow text by +1, and add `barberId` to the final confirmation's `ConfirmRow` list (after the service row):

```tsx
<ConfirmRow labelSr="BARBER" labelLat="MAJSTOR" value={barbers.find((b) => b.id === barberId)?.display_name ?? "—"} />
```

- [ ] **Step 4: `zakazivanje/page.tsx` — fetch barbers, read `?barber=`**

```tsx
export default async function ZakazivanjePage({ searchParams }: { searchParams: { barber?: string } }) {
  const supabase = createClient();

  const [salonRes, servicesRes, barbersRes] = await Promise.all([
    supabase
      .from("salons")
      .select("id, name, address, working_hours")
      .eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa")
      .single(),
    supabase
      .from("services")
      .select("id, name_sr, name_lat, price, duration_min, description_sr, description_lat")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("public_barbers")
      .select("id, display_name, photo_url, role_title_sr, role_title_lat, specialty_sr, specialty_lat")
      .order("public_sort_order", { ascending: true }),
  ]);

  const services = servicesRes.data ?? [];
  const barbers = barbersRes.data ?? [];
  const salon = salonRes.data;

  // ...unchanged JSON-LD block...

  return (
    <>
      <JsonLd data={serviceListJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <BookingFlow
        services={services}
        barbers={barbers}
        salonId={salon?.id ?? ""}
        salonAddress={salon?.address ?? ""}
        workingHours={salon?.working_hours ?? null}
        initialBarberId={searchParams.barber}
      />
    </>
  );
}
```

- [ ] **Step 5: Manual verification**

With at least one `admin_users` row having `show_on_site=true` (set via `/admin/berberi`), load `/zakazivanje`: step 1 shows barber cards; picking one and continuing through to step 3 (time) shows a full slot grid (no bookings yet ⇒ nothing taken); create a booking; reload `/zakazivanje` and pick the same barber + date — the just-booked slot must show as taken; pick a *different* barber for the same date — that same slot must show as **available** (proves the filter is barber-scoped, not salon-wide). Then visit `/zakazivanje?barber=<that-id>` directly and confirm it lands on step 2 with the barber preselected.

- [ ] **Step 6: Commit**

```bash
git add web/src/app/zakazivanje
git commit -m "Add barber-selection step to booking flow, filter slot availability per barber"
```

---

## Phase B — Blog CMS

### Task B1: Migration — `blog_posts` table

**Files:**
- Create: `supabase/migrations/015_blog_posts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration 015: blog posts
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title_sr TEXT NOT NULL,
  title_lat TEXT NOT NULL,
  excerpt_sr TEXT,
  excerpt_lat TEXT,
  body_sr TEXT NOT NULL DEFAULT '',
  body_lat TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_salon_published ON blog_posts (salon_id, published, published_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts public read published" ON blog_posts;
CREATE POLICY "blog_posts public read published" ON blog_posts
  FOR SELECT USING (
    published = true
    AND (published_at IS NULL OR published_at <= NOW())
  );

DROP POLICY IF EXISTS "blog_posts admin write" ON blog_posts;
CREATE POLICY "blog_posts admin write" ON blog_posts
  USING (is_admin_of(salon_id));
```

- [ ] **Step 2: Apply + verify**

```sql
select * from blog_posts; -- 0 rows, no error
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/015_blog_posts.sql
git commit -m "Add blog_posts table"
```

---

### Task B2: Admin screen — `/admin/blog`

**Files:**
- Create: `src/app/admin/(app)/blog/actions.ts`
- Create: `src/app/admin/(app)/blog/blog-client.tsx`
- Create: `src/app/admin/(app)/blog/page.tsx`

**Interfaces:**
- Produces: `getBlogPosts()`, `upsertBlogPost(input)`, `deleteBlogPost(id)`, `uploadBlogCover(id, formData)` — mirrors `usluge`/`galerija` exactly.

- [ ] **Step 1: Server actions**

```typescript
// src/app/admin/(app)/blog/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/auth/with-admin";
import { uploadImage, deleteFromStorage } from "@/lib/storage/upload";
import { pathFromUrl } from "@/lib/storage/url";

export type BlogPost = {
  id: string;
  slug: string;
  title_sr: string;
  title_lat: string;
  excerpt_sr: string | null;
  excerpt_lat: string | null;
  body_sr: string;
  body_lat: string;
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
  sort_order: number;
};

export async function getBlogPosts(): Promise<BlogPost[]> {
  const session = await requireOwner();
  const sb = createAdminClient();
  const { data } = await sb
    .from("blog_posts")
    .select("id, slug, title_sr, title_lat, excerpt_sr, excerpt_lat, body_sr, body_lat, cover_image_url, published, published_at, sort_order")
    .eq("salon_id", session.salonId)
    .order("sort_order", { ascending: true });
  return (data as BlogPost[]) ?? [];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function upsertBlogPost(input: {
  id?: string;
  title_sr: string;
  title_lat: string;
  excerpt_sr: string;
  excerpt_lat: string;
  body_sr: string;
  body_lat: string;
  published: boolean;
}) {
  const session = await requireOwner();
  const sb = createAdminClient();

  if (input.id) {
    await sb
      .from("blog_posts")
      .update({
        title_sr: input.title_sr,
        title_lat: input.title_lat,
        excerpt_sr: input.excerpt_sr,
        excerpt_lat: input.excerpt_lat,
        body_sr: input.body_sr,
        body_lat: input.body_lat,
        published: input.published,
        published_at: input.published ? new Date().toISOString() : null,
      })
      .eq("id", input.id)
      .eq("salon_id", session.salonId);
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath("/");
    return { ok: true as const, id: input.id };
  }

  const slug = slugify(input.title_lat);
  const { data: maxRow } = await sb
    .from("blog_posts")
    .select("sort_order")
    .eq("salon_id", session.salonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data: created, error } = await sb
    .from("blog_posts")
    .insert({
      salon_id: session.salonId,
      slug,
      title_sr: input.title_sr,
      title_lat: input.title_lat,
      excerpt_sr: input.excerpt_sr,
      excerpt_lat: input.excerpt_lat,
      body_sr: input.body_sr,
      body_lat: input.body_lat,
      published: input.published,
      published_at: input.published ? new Date().toISOString() : null,
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false as const, error: error?.message ?? "INSERT_FAILED" };

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  return { ok: true as const, id: created.id as string };
}

export async function deleteBlogPost(id: string) {
  const session = await requireOwner();
  const sb = createAdminClient();
  const { data: row } = await sb.from("blog_posts").select("cover_image_url").eq("id", id).eq("salon_id", session.salonId).single();
  if (row?.cover_image_url) {
    const path = pathFromUrl(row.cover_image_url, "gallery");
    if (path) await deleteFromStorage("gallery", path);
  }
  await sb.from("blog_posts").delete().eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  return { ok: true as const };
}

export async function uploadBlogCover(id: string, formData: FormData) {
  const session = await requireOwner();
  const file = formData.get("file");
  const filename = formData.get("filename");
  if (!(file instanceof Blob)) return { ok: false as const, error: "MISSING_FILE" };
  if (typeof filename !== "string" || !filename) return { ok: false as const, error: "MISSING_FILENAME" };

  const upload = await uploadImage("gallery", file, filename);
  if (!upload.ok) return { ok: false as const, error: upload.error };

  const sb = createAdminClient();
  await sb.from("blog_posts").update({ cover_image_url: upload.url }).eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { ok: true as const, url: upload.url };
}
```

- [ ] **Step 2: Page wrapper**

```tsx
// src/app/admin/(app)/blog/page.tsx
import { getBlogPosts } from "./actions";
import { BlogAdminClient } from "./blog-client";

export default async function BlogAdminPage() {
  const posts = await getBlogPosts();
  return <BlogAdminClient posts={posts} />;
}
```

- [ ] **Step 3: Client screen**

```tsx
// src/app/admin/(app)/blog/blog-client.tsx
"use client";

import { useState, useTransition } from "react";
import { compressToWebP } from "@/lib/storage/compress-client";
import { upsertBlogPost, deleteBlogPost, uploadBlogCover, type BlogPost } from "./actions";

const EMPTY: Omit<BlogPost, "id" | "slug" | "sort_order" | "published_at" | "cover_image_url"> = {
  title_sr: "", title_lat: "", excerpt_sr: "", excerpt_lat: "", body_sr: "", body_lat: "", published: false,
};

export function BlogAdminClient({ posts: initial }: { posts: BlogPost[] }) {
  const [posts, setPosts] = useState(initial);
  const [editing, setEditing] = useState<BlogPost | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>БЛОГ</span>
            <span data-lat>BLOG</span>
          </div>
          <div className="adm-page-subtitle">{posts.length} članaka</div>
        </div>
        <button className="adm-fab-btn" type="button" onClick={() => setEditing("new")}>+</button>
      </div>

      {posts.length === 0 && (
        <div className="adm-empty">
          <span data-sr>Нема чланака. Додај први.</span>
          <span data-lat>Nema članaka. Dodaj prvi.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {posts.map((p) => (
          <button key={p.id} type="button" className="adm-list-row" onClick={() => setEditing(p)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left" }}>
            <div style={{ width: 56, height: 40, flexShrink: 0, background: "var(--brown-900)", overflow: "hidden" }}>
              {p.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.title_lat}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>/blog/{p.slug}</div>
            </div>
            <span style={{ fontSize: 10, letterSpacing: ".08em", padding: "3px 8px", background: p.published ? "var(--mustard)" : "transparent", border: p.published ? "none" : "1px solid rgba(239,233,221,.2)", color: p.published ? "var(--brown-950)" : "rgba(239,233,221,.5)" }}>
              {p.published ? "OBJAVLJEN" : "NACRT"}
            </span>
          </button>
        ))}
      </div>

      {editing && (
        <PostEditor
          post={editing === "new" ? { id: "", slug: "", sort_order: 0, published_at: null, cover_image_url: null, ...EMPTY } : editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(input) => start(async () => {
            const res = await upsertBlogPost(input);
            if (res.ok) {
              const saved: BlogPost = { ...input, id: res.id, slug: editing === "new" ? "" : (editing as BlogPost).slug, sort_order: 0, published_at: input.published ? new Date().toISOString() : null, cover_image_url: editing === "new" ? null : (editing as BlogPost).cover_image_url };
              setPosts((prev) => editing === "new" ? [...prev, saved] : prev.map((p) => p.id === res.id ? { ...p, ...input } : p));
            }
            setEditing(null);
          })}
          onDelete={editing !== "new" ? () => start(async () => {
            if (confirm("Obriši članak?")) {
              await deleteBlogPost((editing as BlogPost).id);
              setPosts((prev) => prev.filter((p) => p.id !== (editing as BlogPost).id));
              setEditing(null);
            }
          }) : undefined}
          onUpload={editing !== "new" ? async (file) => {
            const { blob, filename } = await compressToWebP(file);
            const fd = new FormData();
            fd.append("filename", filename);
            fd.append("file", blob, filename);
            const res = await uploadBlogCover((editing as BlogPost).id, fd);
            if (res.ok) setPosts((prev) => prev.map((p) => p.id === (editing as BlogPost).id ? { ...p, cover_image_url: res.url } : p));
          } : undefined}
        />
      )}
    </>
  );
}

function PostEditor({ post, pending, onClose, onSave, onDelete, onUpload }: {
  post: BlogPost;
  pending: boolean;
  onClose: () => void;
  onSave: (input: { id?: string; title_sr: string; title_lat: string; excerpt_sr: string; excerpt_lat: string; body_sr: string; body_lat: string; published: boolean }) => void;
  onDelete?: () => void;
  onUpload?: (file: File) => void;
}) {
  const [titleSr, setTitleSr] = useState(post.title_sr);
  const [titleLat, setTitleLat] = useState(post.title_lat);
  const [excerptSr, setExcerptSr] = useState(post.excerpt_sr ?? "");
  const [excerptLat, setExcerptLat] = useState(post.excerpt_lat ?? "");
  const [bodySr, setBodySr] = useState(post.body_sr);
  const [bodyLat, setBodyLat] = useState(post.body_lat);
  const [published, setPublished] = useState(post.published);

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">{post.id ? post.title_lat : "NOVI ČLANAK"}</div>
        <div style={{ padding: "0 20px 16px" }}>
          {post.id && onUpload && (
            <>
              <div style={{ width: "100%", height: 140, background: "var(--brown-900)", marginBottom: 8, overflow: "hidden" }}>
                {post.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} style={{ marginBottom: 16 }} />
            </>
          )}

          <label className="adm-form-label">NASLOV (ćir.)</label>
          <input className="adm-input" value={titleSr} onChange={(e) => setTitleSr(e.target.value)} style={{ marginBottom: 8 }} />
          <label className="adm-form-label">NASLOV (lat.)</label>
          <input className="adm-input" value={titleLat} onChange={(e) => setTitleLat(e.target.value)} style={{ marginBottom: 8 }} />

          <label className="adm-form-label">KRATAK OPIS (ćir.)</label>
          <input className="adm-input" value={excerptSr} onChange={(e) => setExcerptSr(e.target.value)} style={{ marginBottom: 8 }} />
          <label className="adm-form-label">KRATAK OPIS (lat.)</label>
          <input className="adm-input" value={excerptLat} onChange={(e) => setExcerptLat(e.target.value)} style={{ marginBottom: 8 }} />

          <label className="adm-form-label">TEKST (ćir.) — prazan red = nov pasus</label>
          <textarea className="adm-input" value={bodySr} onChange={(e) => setBodySr(e.target.value)} rows={8} style={{ marginBottom: 8 }} />
          <label className="adm-form-label">TEKST (lat.) — prazan red = nov pasus</label>
          <textarea className="adm-input" value={bodyLat} onChange={(e) => setBodyLat(e.target.value)} rows={8} style={{ marginBottom: 12 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span data-sr>Објављен</span>
            <span data-lat>Objavljen</span>
          </label>

          <button
            className="adm-btn adm-btn-block"
            disabled={pending || !titleLat.trim()}
            onClick={() => onSave({ id: post.id || undefined, title_sr: titleSr, title_lat: titleLat, excerpt_sr: excerptSr, excerpt_lat: excerptLat, body_sr: bodySr, body_lat: bodyLat, published })}
          >
            <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
          </button>
          <button className="adm-btn adm-btn-secondary adm-btn-block" style={{ marginTop: 8 }} onClick={onClose}>
            <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
          </button>
          {onDelete && (
            <button className="adm-btn adm-btn-danger adm-btn-block" style={{ marginTop: 8 }} disabled={pending} onClick={onDelete}>
              <span data-sr>ОБРИШИ</span><span data-lat>OBRIŠI</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

`/admin/blog` → "+" creates a draft, fill title/excerpt/body, save, toggle published, confirm it disappears from `/blog` while a draft and appears once published (Task B3 must exist first — do Step 5 verification after B3 is done).

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/admin/(app)/blog"
git commit -m "Add /admin/blog CRUD screen"
```

---

### Task B3: Public routes — `/blog` and `/blog/[slug]`

**Files:**
- Create: `src/lib/seo/blog.ts`
- Create: `src/app/blog/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`

- [ ] **Step 1: Article JSON-LD helper**

```typescript
// src/lib/seo/blog.ts
type BlogPostInput = {
  slug: string;
  title_lat: string;
  excerpt_lat: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

export function buildArticleJsonLd({ post, siteUrl }: { post: BlogPostInput; siteUrl: string }) {
  const url = `${siteUrl}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title_lat,
    ...(post.excerpt_lat ? { description: post.excerpt_lat } : {}),
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    author: { "@type": "Organization", name: "Barbershop Vuk" },
    publisher: { "@type": "Organization", name: "Barbershop Vuk", "@id": `${siteUrl}/#business` },
    mainEntityOfPage: url,
  };
}
```

- [ ] **Step 2: Blog index**

```tsx
// src/app/blog/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description: "Saveti za stil, negu brade i kose iz Barbershop Vuk.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const sb = createClient();
  const { data: posts } = await sb
    .from("blog_posts")
    .select("slug, title_sr, title_lat, excerpt_sr, excerpt_lat, cover_image_url, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });

  return (
    <>
      <SiteNav />
      <main id="main-content" className="section" style={{ background: "var(--brown-950)", minHeight: "60vh" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="section-label"><span>BLOG</span></div>
          <h1 className="section-title" style={{ color: "var(--cream)" }}>
            <span data-sr>Our blog.</span>
            <span data-lat>Naš blog.</span>
          </h1>
          {(!posts || posts.length === 0) && (
            <p style={{ color: "var(--muted, #8B857C)" }}>
              <span data-sr>No posts yet.</span>
              <span data-lat>Još uvek nema članaka.</span>
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {(posts ?? []).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ position: "relative", height: 220, overflow: "hidden", background: "var(--brown-900)" }}>
                  {p.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <h3 style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 19, textTransform: "uppercase", margin: "22px 0 10px" }}>
                  <span data-sr>{p.title_sr}</span>
                  <span data-lat>{p.title_lat}</span>
                </h3>
                {p.published_at && (
                  <span style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--mustard)" }}>
                    {new Date(p.published_at).toLocaleDateString("sr-RS", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 3: Blog post detail**

```tsx
// src/app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { buildArticleJsonLd } from "@/lib/seo/blog";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const sb = createClient();
  const { data } = await sb
    .from("blog_posts")
    .select("title_lat, excerpt_lat, cover_image_url")
    .eq("slug", params.slug)
    .eq("published", true)
    .single();
  if (!data) return { title: "Blog" };
  return {
    title: data.title_lat,
    description: data.excerpt_lat ?? undefined,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      type: "article",
      url: `/blog/${params.slug}`,
      title: data.title_lat,
      description: data.excerpt_lat ?? undefined,
      ...(data.cover_image_url ? { images: [{ url: data.cover_image_url, alt: data.title_lat }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const sb = createClient();
  const { data: post } = await sb
    .from("blog_posts")
    .select("slug, title_sr, title_lat, body_sr, body_lat, cover_image_url, published_at")
    .eq("slug", params.slug)
    .eq("published", true)
    .single();

  if (!post) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const articleJsonLd = buildArticleJsonLd({ post, siteUrl });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd({
    siteUrl,
    items: [
      { name: "Početna", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title_lat, path: `/blog/${post.slug}` },
    ],
  });

  const paragraphsLat = post.body_lat.split(/\n\s*\n/).filter(Boolean);
  const paragraphsSr = post.body_sr.split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <SiteNav />
      <main id="main-content" style={{ background: "var(--brown-950)", minHeight: "60vh" }}>
        <article style={{ maxWidth: 760, margin: "0 auto", padding: "96px 40px" }}>
          {post.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.cover_image_url} alt="" style={{ width: "100%", height: 360, objectFit: "cover", marginBottom: 32 }} />
          )}
          <h1 style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: "clamp(32px,5vw,48px)", textTransform: "uppercase", color: "var(--cream)", marginBottom: 16 }}>
            <span data-sr>{post.title_sr}</span>
            <span data-lat>{post.title_lat}</span>
          </h1>
          {post.published_at && (
            <span style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--mustard)", display: "block", marginBottom: 32 }}>
              {new Date(post.published_at).toLocaleDateString("sr-RS", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
            </span>
          )}
          <div style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(239,233,221,.85)" }} data-sr>
            {paragraphsSr.map((p, i) => <p key={i} style={{ marginBottom: 20 }}>{p}</p>)}
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(239,233,221,.85)" }} data-lat>
            {paragraphsLat.map((p, i) => <p key={i} style={{ marginBottom: 20 }}>{p}</p>)}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 4: Manual verification**

Publish a post from `/admin/blog`; confirm it appears on `/blog`, clicking through renders `/blog/<slug>` with title/body/cover; view source and confirm the `BlogPosting` JSON-LD script tag is present; un-publish it and confirm `/blog/<slug>` now 404s.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/seo/blog.ts web/src/app/blog
git commit -m "Add public /blog and /blog/[slug] routes"
```

---

## Phase C — Homepage v2

### Task C1: CSS additions for the new sections

**Files:**
- Modify: `src/styles/legacy.css`

Append a new section to the end of the file (after the existing "SITE BANNER" block). All colors/fonts reuse the existing tokens from the prior red/cream/Anton rebrand — no new `:root` variables needed except the ghost-watermark opacity, which is a literal (matches the design spec exactly: `rgba(239,233,221,.035)`).

- [ ] **Step 1: Add the CSS**

```css
/* ── HOMEPAGE V2 — HERO CAROUSEL, GHOST WATERMARK, ICON TILES ──── */

.hero-v2 {
  position: relative;
  height: 760px;
  overflow: hidden;
}
.hero-v2-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero-v2-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(10,10,11,.97) 0%, rgba(10,10,11,.86) 38%, rgba(10,10,11,.35) 70%, rgba(10,10,11,.72) 100%);
  z-index: 2;
}
.hero-v2-content {
  position: relative;
  z-index: 3;
  max-width: 1280px;
  margin: 0 auto;
  height: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.hero-v2-inner {
  max-width: 620px;
  animation: vukFade .5s ease both;
}
@keyframes vukFade {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.hero-v2-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(239,233,221,.2);
  padding: 8px 15px;
  margin-bottom: 30px;
  font-size: 11px;
  letter-spacing: .2em;
}
.hero-v2-pill-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--mustard);
  animation: vukPulse 1.8s ease-in-out infinite;
}
@keyframes vukPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .35; transform: scale(.8); }
}
.hero-v2-title {
  margin: 0;
  font-family: var(--font-anton), 'Anton', sans-serif;
  font-weight: 400;
  font-size: 82px;
  line-height: .92;
  letter-spacing: .005em;
  text-transform: uppercase;
}
.hero-v2-phone-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 26px 0 40px;
}
.hero-v2-phone-icon {
  display: inline-flex;
  width: 44px; height: 44px;
  border: 1px solid rgba(239,233,221,.24);
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hero-v2-phone-num {
  font-family: var(--font-anton), 'Anton', sans-serif;
  font-size: 26px;
  letter-spacing: .04em;
}
.hero-v2-arrow-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  width: 52px; height: 52px;
  background: transparent;
  border: 1px solid rgba(239,233,221,.24);
  color: var(--cream);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color .2s, color .2s;
}
.hero-v2-arrow-btn:hover { border-color: var(--mustard); color: var(--mustard); }
.hero-v2-arrow-btn.prev { left: 26px; }
.hero-v2-arrow-btn.next { right: 26px; }
.hero-v2-rail {
  position: absolute;
  left: 0; bottom: 0;
  z-index: 4;
  height: 4px;
  width: 15%;
  background: var(--mustard);
}
.hero-v2-socials {
  position: absolute;
  z-index: 4;
  left: 50%; bottom: 26px;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
}
.hero-v2-socials a { color: var(--muted, #8B857C); transition: color .2s; }
.hero-v2-socials a:hover { color: var(--mustard); }

/* Ghost watermark word behind a section header */
.ghost-watermark {
  position: absolute;
  left: 0; right: 0;
  font-family: var(--font-anton), 'Anton', sans-serif;
  line-height: .8;
  color: rgba(239,233,221,.035);
  z-index: 0;
  pointer-events: none;
  white-space: nowrap;
  text-align: center;
}

/* Reusable kicker: red 34×2 bar + red uppercase label */
.kicker-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}
.kicker-bar { width: 34px; height: 2px; background: var(--mustard); }
.kicker-label { font-size: 12px; font-weight: 600; letter-spacing: .24em; color: var(--mustard); }

/* Skewed red icon tile (services v2) */
.icon-tile {
  flex: 0 0 auto;
  width: 52px; height: 52px;
  background: var(--mustard);
  display: flex;
  align-items: center;
  justify-content: center;
  transform: skewX(-8deg);
}
.icon-tile svg { transform: skewX(8deg); }

/* Team / hours band */
.band-section { position: relative; }
.band-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.band-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(10,10,11,.95) 0%, rgba(10,10,11,.8) 55%, rgba(10,10,11,.9) 100%);
  z-index: 2;
}
.band-content {
  position: relative; z-index: 3;
  max-width: 1280px; margin: 0 auto;
  padding: 96px 40px;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 72px;
}
.hours-grid-v2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 44px; }
.hours-grid-v2 .row {
  display: flex; justify-content: space-between;
  padding: 13px 0;
  border-bottom: 1px solid rgba(239,233,221,.12);
  font-size: 14px;
}
.hours-grid-v2 .day { font-family: var(--font-anton), 'Anton', sans-serif; letter-spacing: .04em; }

/* Barber cards */
.barber-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.barber-card { border: 1px solid rgba(239,233,221,.1); background: var(--brown-900); }
.barber-photo { position: relative; height: 420px; overflow: hidden; }
.barber-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.barber-photo-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(0deg, rgba(16,16,17,.95) 0%, rgba(16,16,17,0) 45%);
  z-index: 2;
}
.barber-chip {
  position: absolute; left: 24px; top: 24px; z-index: 3;
  background: var(--mustard);
  font-family: var(--font-anton), 'Anton', sans-serif;
  font-size: 12px; letter-spacing: .08em;
  padding: 7px 13px;
}
.barber-body { padding: 32px; }
.barber-name { margin: 0; font-family: var(--font-anton), 'Anton', sans-serif; font-size: 30px; letter-spacing: .02em; text-transform: uppercase; }
.barber-role { font-size: 13px; letter-spacing: .14em; color: var(--mustard); margin: 8px 0 16px; }
.barber-bio { margin: 0 0 26px; font-size: 14px; line-height: 1.65; color: var(--muted, #8B857C); }

@media (max-width: 900px) {
  .hero-v2 { height: auto; min-height: 560px; }
  .band-content { grid-template-columns: 1fr; }
  .barber-grid { grid-template-columns: 1fr; }
  .hero-v2-title { font-size: 48px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/styles/legacy.css
git commit -m "Add CSS for homepage v2 sections (hero carousel, ghost watermark, barber cards, team band)"
```

---

### Task C2: Hero carousel client component

**Files:**
- Create: `src/app/hero-carousel.tsx`

The rest of the homepage stays a server component (data-fetching); only the rotating headline + arrows need client state, matching the `.dc.html` reference's `slides`/`prevSlide`/`nextSlide` behavior.

- [ ] **Step 1: Write the component**

```tsx
// src/app/hero-carousel.tsx
"use client";

import { useState } from "react";

const SLIDES: { sr: string; lat: string }[] = [
  { sr: "We'll keep you looking sharp", lat: "Zadržaćemo tvoj besprekoran izgled" },
  { sr: "Where a haircut turns into a story", lat: "Mesto gde se rez pretvara u priču" },
  { sr: "Haircut, beard, and a good story", lat: "Šišanje, brada i dobra priča" },
];

export function HeroCarousel() {
  const [slide, setSlide] = useState(0);
  const n = SLIDES.length;

  return (
    <>
      <h1 className="hero-v2-title" key={slide}>
        <span data-sr>{SLIDES[slide].sr}</span>
        <span data-lat>{SLIDES[slide].lat}</span>
      </h1>

      <button
        type="button"
        className="hero-v2-arrow-btn prev"
        aria-label="Previous headline"
        onClick={() => setSlide((s) => (s - 1 + n) % n)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
      </button>
      <button
        type="button"
        className="hero-v2-arrow-btn next"
        aria-label="Next headline"
        onClick={() => setSlide((s) => (s + 1) % n)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
      </button>
    </>
  );
}
```

Note: the arrow buttons are visually positioned `absolute` (see `.hero-v2-arrow-btn` in Task C1) so they must render inside `.hero-v2` (a `position: relative` ancestor), not nested inside `.hero-v2-content` — place `<HeroCarousel />`'s buttons as siblings of `.hero-v2-content` in Task C3's JSX, or wrap `.hero-v2` itself around everything this component renders. Simplest: keep `<HeroCarousel />` rendering only the `<h1>` inline within `.hero-v2-inner`, and hoist the two arrow buttons out to `page.tsx` directly as plain (non-interactive-state) elements is not possible since they need `onClick` — so `HeroCarousel` must render a fragment containing all three pieces, and `page.tsx` places `<HeroCarousel />` directly as a child of the `.hero-v2` div (not `.hero-v2-content`), then a *second*, separate small client piece renders just the `<h1>` inside `.hero-v2-content`. To avoid a second client component, render `HeroCarousel` once as a direct child of `.hero-v2`, and have it use a portal-free approach: render the `<h1>` positioned via a wrapping `<div className="hero-v2-content"><div className="hero-v2-inner">...</div></div>` **inside** `HeroCarousel` itself, i.e. `HeroCarousel` owns the entire `.hero-v2-content` block (pill, title, address, phone, CTAs) plus the two arrow buttons as siblings — see Task C3 for the exact split (`HeroCarousel` wraps everything from the status pill through the CTA row).

- [ ] **Step 2: Commit** (folded into Task C3's commit — this file has no standalone runtime behavior to verify until wired into the page)

---

### Task C3: Homepage rebuild — `src/app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `public_barbers` view (Task A1), `blog_posts` table (Task B1), `HeroCarousel` (Task C2).

This replaces the entire section list. Reuse the existing top-of-file data fetch (salon/services/gallery/content), add two more `Promise.all` entries, and swap out the section JSX. Because this is the single largest edit, do it as one full-file rewrite rather than a patch — read the current `src/app/page.tsx` immediately before editing (it may have drifted since this plan was written) and preserve the exact existing `getC()`/`splitTitle()`/`GALLERY` fallback machinery, since none of that changes.

- [ ] **Step 1: Extend the parallel fetch**

Add to the existing `Promise.all([...])` in `HomePage`:

```typescript
const [salonRes, servicesRes, galleryRes, contentRes, barbersRes, blogRes] = await Promise.all([
  supabase.from("salons").select("name, address, phone, email, working_hours, social_links").eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa").single(),
  supabase.from("services").select("name_sr, name_lat, price, duration_min, featured, description_sr, description_lat, meta_sr, meta_lat").eq("active", true).order("sort_order", { ascending: true }),
  supabase.from("gallery_images").select("id, url, alt_sr, alt_lat, sort_order, size").order("sort_order", { ascending: true }),
  supabase.from("site_content").select("key, value_sr, value_lat"),
  supabase.from("public_barbers").select("id, display_name, photo_url, bio_sr, bio_lat, specialty_sr, specialty_lat, role_title_sr, role_title_lat").order("public_sort_order", { ascending: true }),
  supabase.from("blog_posts").select("slug, title_sr, title_lat, cover_image_url, published_at").eq("published", true).order("published_at", { ascending: false }).limit(3),
]);
const barbers = barbersRes.data ?? [];
const blogPosts = blogRes.data ?? [];
```

- [ ] **Step 2: Replace the hero section**

```tsx
import { HeroCarousel } from "./hero-carousel";
```

```tsx
{/* ── HERO ────────────────────────────────────────── */}
<header id="pocetna" className="hero-v2">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img className="hero-v2-bg" src="/hero-vuk.webp" alt="" />
  <div className="hero-v2-scrim" />

  <div className="hero-v2-content">
    <div className="hero-v2-inner">
      <div className="hero-v2-pill">
        <span className="hero-v2-pill-dot" />
        <span data-sr>MEN'S BARBERSHOP · BATAJNICA, BELGRADE</span>
        <span data-lat>MUŠKA BERBERNICA · BATAJNICA, BEOGRAD</span>
      </div>

      <HeroCarousel />

      <p style={{ margin: "30px 0 0", fontSize: 15, lineHeight: 1.6, color: "#c9c3b8", maxWidth: 400 }}>
        {salon?.address ?? "Majora Zorana Radosavljevića 138, Beograd 11273"}
      </p>

      <div className="hero-v2-phone-row">
        <span className="hero-v2-phone-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mustard)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
        </span>
        <a href={`tel:${formatPhoneE164(salon?.phone ?? "060 1424576")}`} className="hero-v2-phone-num" style={{ color: "inherit", textDecoration: "none" }}>
          {salon?.phone ?? "060 1424576"}
        </a>
      </div>

      <div className="hero-cta-row">
        <a href="/zakazivanje" className="btn-primary" style={{ fontSize: 15, padding: "18px 30px" }}>
          <span data-sr>BOOK NOW</span><span data-lat>ZAKAŽI TERMIN</span> →
        </a>
        <a href="#usluge" className="btn-ghost" style={{ padding: "18px 30px" }}>
          <span data-sr>SERVICES</span><span data-lat>USLUGE</span>
        </a>
      </div>
    </div>
  </div>

  <div className="hero-v2-rail" />
  <div className="hero-v2-socials">
    <SocialLinksRow links={socialLinks} inline />
  </div>
</header>
```

Note: `SocialLinksRow` currently renders a full row with its own wrapper markup (`src/components/social-links-row.tsx`) — check its props before using it inline here; if it doesn't support an `inline`/bare-icons mode, render the three known platforms directly instead (Facebook/Instagram/TikTok `<a>` + inline `<svg>`, copied verbatim from the `.dc.html` reference's footer social icons block) rather than adding a new prop to a shared component used elsewhere.

- [ ] **Step 3: Replace O nama**

```tsx
{/* ── O NAMA ──────────────────────────────────────── */}
<section id="onama" className="section onama" style={{ position: "relative" }}>
  <div className="ghost-watermark" style={{ top: 64, fontSize: 170 }}>BARBERVUK</div>
  <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80 }}>
    <div>
      <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>ABOUT</span><span className="kicker-label" data-lat>O NAMA</span></div>
      <h2 className="section-title" style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: 52, lineHeight: 1 }}>
        <span data-sr>Professional barbershop<br />for men only.</span>
        <span data-lat>Profesionalna<br />berbernica<br />samo za muškarce</span>
      </h2>
    </div>
    <div>
      <p style={{ margin: "0 0 40px", fontSize: 16, lineHeight: 1.75, color: "var(--muted-cream, #4A453E)" }}>
        <span data-sr>{aboutStory.sr}</span>
        <span data-lat>{aboutStory.lat}</span>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, marginBottom: 42 }}>
        <div>
          <div style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 30, letterSpacing: ".02em" }}>OD 2019.</div>
          <div style={{ height: 1, background: "rgba(26,24,21,.14)", margin: "14px 0" }} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--muted, #8B857C)" }}>
            <span data-sr>Years of loyal customers and word-of-mouth referrals.</span>
            <span data-lat>Godinama gradimo stalne mušterije i preporuke od usta do usta.</span>
          </p>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 30, letterSpacing: ".02em" }}>
            1000+ <span style={{ color: "var(--mustard)" }}>KLIJENATA</span>
          </div>
          <div style={{ height: 1, background: "rgba(26,24,21,.14)", margin: "14px 0" }} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--muted, #8B857C)" }}>
            <span data-sr>Average 4.9 rating from over 120 reviews.</span>
            <span data-lat>Prosečna ocena 4.9 na osnovu preko 120 recenzija.</span>
          </p>
        </div>
      </div>
      <a href="#usluge" className="btn-primary">
        <span data-sr>LEARN MORE</span><span data-lat>DETALJNIJE</span> →
      </a>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Replace Usluge with icon-tile grid**

Keep the existing DB-driven `services`/`DEFAULT_SERVICES_GRID` fallback array and `serviceIcon()` helper (both already in the file) but swap the emoji for the design's line-SVGs and the tile markup for the skewed `.icon-tile`:

```tsx
{/* ── USLUGE ──────────────────────────────────────── */}
<section id="usluge" className="section usluge" style={{ position: "relative" }}>
  <div className="ghost-watermark" style={{ top: 0, fontSize: 150 }} data-sr>SERVICES</div>
  <div className="ghost-watermark" style={{ top: 0, fontSize: 150 }} data-lat>USLUGE</div>
  <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
    <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>SERVICES</span><span className="kicker-label" data-lat>USLUGE</span></div>
    <h2 className="section-title" style={{ color: "var(--cream)", fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: 52, lineHeight: 1 }}>
      <span data-sr>What we offer</span><span data-lat>Šta nudimo</span>
    </h2>
    <p style={{ margin: "0 0 60px", maxWidth: 520, fontSize: 15, lineHeight: 1.65, color: "var(--muted, #8B857C)" }}>
      <span data-sr>Haircuts, beard, and shaving — everything for a tidy look. Cash or card, no surcharges.</span>
      <span data-lat>Šišanje, brada i brijanje — sve što treba za uredan izgled. Plaćanje gotovinom ili karticom, bez doplata.</span>
    </p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "52px 56px" }}>
      {(services.length > 0 ? services : DEFAULT_SERVICES_GRID).map((s, i) => {
        const nameSr = "name_sr" in s ? s.name_sr : s.nameSr;
        const nameLat = "name_lat" in s ? s.name_lat : s.nameLat;
        const descSr = "description_sr" in s ? s.description_sr : undefined;
        const descLat = "description_lat" in s ? s.description_lat : undefined;
        return (
          <div key={i} style={{ display: "flex", gap: 20 }}>
            <span className="icon-tile">{serviceIconSvg(nameLat)}</span>
            <div>
              <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 20, letterSpacing: ".02em", textTransform: "uppercase" }}>
                <span data-sr>{nameSr}</span><span data-lat>{nameLat}</span>
              </h3>
              {(descSr || descLat) && (
                <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.6, color: "var(--muted, #8B857C)" }}>
                  <span data-sr>{descSr ?? ""}</span><span data-lat>{descLat ?? ""}</span>
                </p>
              )}
              <span style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 13, letterSpacing: ".06em", color: "var(--mustard)" }}>
                <span data-sr>FROM </span><span data-lat>OD </span>{s.price} RSD
              </span>
            </div>
          </div>
        );
      })}
    </div>

    <div style={{ marginTop: 40, display: "flex", justifyContent: "flex-end" }}>
      <a href="/zakazivanje" className="btn-primary"><span data-sr>BOOK NOW →</span><span data-lat>ZAKAŽI TERMIN →</span></a>
    </div>
  </div>
</section>
```

Add a `serviceIconSvg()` helper next to the existing `serviceIcon()` function (keep `serviceIcon` too if anything else still imports it — grep first; if unused elsewhere, replace it outright instead of adding a second helper):

```tsx
function serviceIconSvg(nameLat: string): JSX.Element {
  const n = nameLat.toLowerCase();
  const stroke = { stroke: "#EFE9DD", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  if (n.includes("brijanje") || n.includes("shave")) {
    return <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}><path d="M4 4l7 7" /><rect x="10" y="10" width="10" height="4" rx="1" transform="rotate(45 15 12)" /><path d="M14 14l-7 7" /></svg>;
  }
  if (n.includes("brada") || n.includes("beard")) {
    return <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}><path d="M3 8c3 0 4 2 9 2s6-2 9-2" /><path d="M3 8c0 5 3 9 9 9s9-4 9-9" /></svg>;
  }
  if (n.includes("fade")) {
    return <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}><path d="M4 20c2-6 4-9 8-9s6 2 8 5" /><path d="M12 11V4" /><path d="M9 6l3-3 3 3" /></svg>;
  }
  if (n.includes("duge") || n.includes("long")) {
    return <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}><path d="M4 21c0-4 3-7 8-7s8 3 8 7" /><path d="M8 10a4 4 0 0 0 8 0V6a4 4 0 0 0-8 0z" /></svg>;
  }
  return <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>;
}
```

- [ ] **Step 5: Add Tim / Radno vreme band (new section, no DB dependency beyond existing `salon.working_hours` + the existing `HoursCard`-style day list — reuse the file's existing day-name arrays)**

```tsx
{/* ── TIM / RADNO VREME ───────────────────────────── */}
<section className="band-section">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img className="band-bg" src="/legacy/uploads/IMG_0025.jpeg" alt="" />
  <div className="band-scrim" />
  <div className="band-content">
    <div>
      <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>OUR TEAM</span><span className="kicker-label" data-lat>NAŠ TIM</span></div>
      <h2 style={{ margin: "0 0 22px", fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, fontSize: 46, lineHeight: 1, textTransform: "uppercase", color: "var(--cream)" }}>
        <span data-sr>A team of pros<br />is waiting for you</span>
        <span data-lat>Tim profesionalaca<br />te čeka</span>
      </h2>
      <p style={{ margin: "0 0 32px", maxWidth: 420, fontSize: 15, lineHeight: 1.7, color: "#c9c3b8" }}>
        <span data-sr>No waiting in line. Book a time, show up, and let us handle the rest.</span>
        <span data-lat>Bez čekanja u redovima. Zakaži termin, dođi i prepusti se — mi ćemo se pobrinuti za ostalo.</span>
      </p>
      <a href="#berberi" className="btn-primary"><span data-sr>BOOK NOW →</span><span data-lat>ZAKAŽI TERMIN →</span></a>
    </div>
    <div>
      <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>OPENING HOURS</span><span className="kicker-label" data-lat>RADNO VREME</span></div>
      <div className="hours-grid-v2">
        {(["mon", "thu", "tue", "fri", "wed", "sat", "sun"] as const).map((key) => {
          const labels: Record<string, { sr: string; lat: string }> = {
            mon: { sr: "MON", lat: "PON" }, tue: { sr: "TUE", lat: "UTO" }, wed: { sr: "WED", lat: "SRE" },
            thu: { sr: "THU", lat: "ČET" }, fri: { sr: "FRI", lat: "PET" }, sat: { sr: "SAT", lat: "SUB" }, sun: { sr: "SUN", lat: "NED" },
          };
          const wh = (salon?.working_hours as Record<string, { open: string; close: string } | null> | undefined)?.[key];
          return (
            <div key={key} className="row">
              <span className="day" style={{ color: key === "sun" ? "var(--mustard)" : undefined }}>
                <span data-sr>{labels[key].sr}</span><span data-lat>{labels[key].lat}</span>
              </span>
              {wh ? (
                <span style={{ color: "#c9c3b8" }}>{wh.open.slice(0, 5)} — {wh.close.slice(0, 5)}</span>
              ) : (
                <span style={{ color: "#6f6a62" }}><span data-sr>CLOSED</span><span data-lat>ZATVORENO</span></span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 6: Add Berberi section**

```tsx
{/* ── BERBERI ─────────────────────────────────────── */}
<section id="berberi" className="section">
  <div style={{ maxWidth: 1280, margin: "0 auto" }}>
    <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>OUR BARBERS</span><span className="kicker-label" data-lat>MAJSTORI</span></div>
    <h2 className="section-title" style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: 52, lineHeight: 1 }}>
      <span data-sr>Pick your barber</span><span data-lat>Izaberi svog berberina</span>
    </h2>
    <p style={{ margin: "0 0 56px", maxWidth: 520, fontSize: 15, lineHeight: 1.65, color: "var(--muted, #8B857C)" }}>
      <span data-sr>Two master barbers work at Vuk's. Book directly with the one you want — each appointment goes on his own schedule.</span>
      <span data-lat>Kod Vuka rade dvojica majstora. Zakaži direktno kod onog kod koga želiš — svaki termin ide na njegov raspored.</span>
    </p>

    {barbers.length === 0 ? null : (
      <div className="barber-grid">
        {barbers.map((b) => (
          <div key={b.id} className="barber-card">
            <div className="barber-photo">
              {b.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.photo_url} alt={b.display_name ?? ""} />
              )}
              <div className="barber-photo-scrim" />
              {(b.specialty_sr || b.specialty_lat) && (
                <span className="barber-chip">
                  <span data-sr>{b.specialty_sr}</span><span data-lat>{b.specialty_lat}</span>
                </span>
              )}
            </div>
            <div className="barber-body">
              <h3 className="barber-name">{b.display_name}</h3>
              <div className="barber-role"><span data-sr>{b.role_title_sr}</span><span data-lat>{b.role_title_lat}</span></div>
              {(b.bio_sr || b.bio_lat) && (
                <p className="barber-bio"><span data-sr>{b.bio_sr}</span><span data-lat>{b.bio_lat}</span></p>
              )}
              <a href={`/zakazivanje?barber=${b.id}`} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                <span data-sr>Book with {b.display_name} →</span>
                <span data-lat>Zakaži kod {b.display_name} →</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</section>
```

- [ ] **Step 7: Keep Galerija as-is; add Blog teaser; replace Utisci/Lokacija with the CTA band + footer**

Galerija section: unchanged (already close to the new spec's mosaic grid). After it, add:

```tsx
{/* ── BLOG ────────────────────────────────────────── */}
{blogPosts.length > 0 && (
  <section id="blog" className="section" style={{ position: "relative" }}>
    <div className="ghost-watermark" style={{ top: -30, fontSize: 150 }} data-sr>TIPS</div>
    <div className="ghost-watermark" style={{ top: -30, fontSize: 150 }} data-lat>SAVETI</div>
    <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
      <div className="kicker-row"><span className="kicker-bar" /><span className="kicker-label" data-sr>BLOG</span><span className="kicker-label" data-lat>BLOG</span></div>
      <h2 className="section-title" style={{ fontFamily: "var(--font-anton), 'Anton', sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: 52, lineHeight: 1 }}>
        <span data-sr>Our blog</span><span data-lat>Naš blog</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginTop: 48 }}>
        {blogPosts.map((p) => (
          <a key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ position: "relative", height: 260, overflow: "hidden" }}>
              {p.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <h3 style={{ margin: "22px 0 10px", fontFamily: "var(--font-anton), 'Anton', sans-serif", fontSize: 19, lineHeight: 1.2, textTransform: "uppercase" }}>
              <span data-sr>{p.title_sr}</span><span data-lat>{p.title_lat}</span>
            </h3>
            {p.published_at && (
              <span style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--mustard)" }}>
                {new Date(p.published_at).toLocaleDateString("sr-RS", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  </section>
)}
```

Then keep the existing `{/* ── CTA BAND ────────────────────────────────────── */}` section and `<SiteFooter .../>` call exactly as they are today — **remove** the `{/* ── UTISCI ── */}` and `{/* ── LOKACIJA ── */}` sections entirely (per the user's confirmed choice to replace, not append). Also remove the now-unused `HoursCard` function, `REVIEWS` array, and `getC("review_1"...)`/`review1`/`review2`/`review3` variables if nothing else in the file references them after this edit — grep the file for `HoursCard` and `REVIEWS` before deleting to confirm no other section still calls them.

- [ ] **Step 8: Manual verification**

`npm run dev`, load `/`: hero photo + carousel arrows cycle 3 headlines; O nama renders with the ghost `BARBERVUK` watermark behind it (very faint, check it's not overpowering — it's opacity .035); Usluge shows skewed red icon tiles; the team/hours band renders over a photo with a working-hours grid and Sunday in red; Berberi section — if no `admin_users` row has `show_on_site=true` yet, the section renders nothing (not broken) — set one via `/admin/berberi` and reload to confirm cards + "Zakaži kod X" link land on `/zakazivanje?barber=<id>` pre-selected (Task A3); Galerija unchanged; Blog section — empty if no published posts, populates once one exists (Task B2/B3); CTA band + footer unchanged from before.

- [ ] **Step 9: Commit**

```bash
git add web/src/app/page.tsx web/src/app/hero-carousel.tsx
git commit -m "Rebuild homepage: hero carousel, ghost-watermark sections, berberi, blog teaser"
```

---

### Task C4: Nav + footer restructure

**Files:**
- Modify: `src/components/site-nav.tsx`
- Modify: `src/components/site-footer.tsx`

- [ ] **Step 1: Nav** — add `#blog` link (between Galerija and Kontakt) and `#berberi` is intentionally **not** a top-level nav item (it's reached via the homepage scroll or the hero's "Book now" CTA) to avoid crowding six links into the existing nav bar width; keep the current logo (`logo-120.png` wolf mark) rather than swapping to the `.dc.html` reference's plain skewed "V" square — the real logo asset already exists and is better than a placeholder shape.

```tsx
<ul className="nav-links">
  <li><a href="/#onama" data-sr>About</a><a href="/#onama" data-lat>O nama</a></li>
  <li><a href="/#usluge" data-sr>Services</a><a href="/#usluge" data-lat>Usluge</a></li>
  <li><a href="/#galerija" data-sr>Gallery</a><a href="/#galerija" data-lat>Galerija</a></li>
  <li><Link href="/blog" data-sr>Blog</Link><Link href="/blog" data-lat>Blog</Link></li>
  <li><Link href="/shop" data-sr>Shop</Link><Link href="/shop" data-lat>Prodavnica</Link></li>
</ul>
```

- [ ] **Step 2: Footer** — add a `Blog` link to the NAVIGACIJA column (after Galerija, before Zakazivanje) in `site-footer.tsx`:

```tsx
<li>
  <Link href="/blog" data-sr>Blog</Link>
  <Link href="/blog" data-lat>Blog</Link>
</li>
```

The newsletter-signup column from the `.dc.html` reference is **not** implemented — there is no email list provider wired into this codebase (no Mailchimp/Resend-audience integration exists) and adding a form with no backend would silently do nothing on submit. Skip it; note it as a follow-up if the client wants a real newsletter later.

- [ ] **Step 3: Manual verification**

Confirm nav shows the Blog link on desktop + mobile, footer shows it too, both link to `/blog`.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/site-nav.tsx web/src/components/site-footer.tsx
git commit -m "Add Blog link to nav and footer"
```

---

## Self-Review

**Spec coverage:**
- Hero carousel ✅ (C2/C3) · O nama ✅ (C3) · Usluge icon-tiles ✅ (C3) · Tim/Radno vreme band ✅ (C3) · Berberi + per-barber booking ✅ (A1-A4, C3) · Galerija ✅ (unchanged, already close) · Blog ✅ (B1-B3, C3) · CTA/Kontakt band ✅ (unchanged from prior session) · Footer ✅ (C4, minus newsletter — explicitly deferred with reason) · Nav ✅ (C4) · Ghost watermarks ✅ (C1/C3) · Skewed icon tiles/logo mark ✅ (C1, logo mark intentionally kept as the real wolf-mark asset instead of the placeholder skewed-V) · Utisci/Lokacija removal ✅ (C3 Step 7).
- Not built: hero background swap for the interior/team-band photo (Task C3 Step 5 reuses an existing gallery photo as a placeholder — flag to the user that a proper wide interior shot should replace `/legacy/uploads/IMG_0025.jpeg` there).

**Placeholder scan:** no TBD/TODO left in any step; every step has runnable code.

**Type consistency:** `Barber` type in `booking-flow.tsx` (A3) matches the `public_barbers` view columns selected in `zakazivanje/page.tsx` (A3 Step 4) and `page.tsx` (C3 Step 1) — all three name the same 7 fields. `BlogPost`/`BarberProfile` types in admin actions match what their respective client components destructure.
