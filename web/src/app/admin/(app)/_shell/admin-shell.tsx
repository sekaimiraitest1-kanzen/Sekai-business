"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { lockAdmin } from "@/lib/auth/admin-actions";
import { isStaff, type AdminSession } from "@/lib/auth/admin-role";

const TABS_OWNER = [
  { href: "/admin/termini", icon: "📅", label_sr: "ТЕРМИНИ", label_lat: "TERMINI" },
  { href: "/admin/usluge", icon: "✂", label_sr: "УСЛУГЕ", label_lat: "USLUGE" },
  { href: "/admin/shop", icon: "🛒", label_sr: "SHOP", label_lat: "SHOP" },
  { href: "/admin/musterije", icon: "👤", label_sr: "МУШT.", label_lat: "MUŠT." },
] as const;

// Staff: termini + statistike + musterije only. No shop / usluge / sajt /
// galerija / blokirano / podesavanja — those are owner-only.
const TABS_STAFF = [
  { href: "/admin/termini", icon: "📅", label_sr: "ТЕРМИНИ", label_lat: "TERMINI" },
  { href: "/admin/statistike", icon: "📊", label_sr: "СТАТ.", label_lat: "STAT." },
  { href: "/admin/musterije", icon: "👤", label_sr: "МУШT.", label_lat: "MUŠT." },
] as const;

const MORE_OWNER = [
  { href: "/admin/galerija", icon: "🖼", label_sr: "ГАЛЕРИЈА", label_lat: "GALERIJA" },
  { href: "/admin/sajt", icon: "📝", label_sr: "САЈТ", label_lat: "SAJT" },
  { href: "/admin/blokirano", icon: "🚫", label_sr: "БЛОКИРАНО", label_lat: "BLOKIRANO" },
  { href: "/admin/statistike", icon: "📊", label_sr: "СТАТИСТИКА", label_lat: "STATISTIKA" },
  { href: "/admin/podesavanja", icon: "⚙", label_sr: "ПОДЕШАВАЊА", label_lat: "PODEŠAVANJA" },
] as const;

export function AdminShell({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const staff = isStaff(session);
  const TABS = staff ? TABS_STAFF : TABS_OWNER;
  const MORE_LINKS = staff ? [] : MORE_OWNER;

  const titleMap: Record<string, { sr: string; lat: string }> = {
    "/admin/termini": { sr: "ТЕРМИНИ", lat: "TERMINI" },
    "/admin/usluge": { sr: "УСЛУГЕ", lat: "USLUGE" },
    "/admin/shop": { sr: "SHOP", lat: "SHOP" },
    "/admin/musterije": { sr: "МУШТЕРИЈЕ", lat: "MUŠTERIJE" },
    "/admin/galerija": { sr: "ГАЛЕРИЈА", lat: "GALERIJA" },
    "/admin/sajt": { sr: "САЈТ САДРЖАЈ", lat: "SAJT SADRŽAJ" },
    "/admin/blokirano": { sr: "БЛОКИРАНО", lat: "BLOKIRANO" },
    "/admin/statistike": { sr: "СТАТИСТИКА", lat: "STATISTIKA" },
    "/admin/podesavanja": { sr: "ПОДЕШАВАЊА", lat: "PODEŠAVANJA" },
  };
  const matched = Object.entries(titleMap).find(([p]) => path.startsWith(p));
  const title = matched ? matched[1] : { sr: "ADMIN", lat: "ADMIN" };

  async function logout() {
    await lockAdmin();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="adm-shell">
      <header className="adm-app-bar">
        <div className="adm-app-bar-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-120.png" alt="Vuk" />
        </div>
        <div className="adm-app-bar-title">
          <span data-sr>{title.sr}</span>
          <span data-lat>{title.lat}</span>
        </div>
        <span className="adm-app-bar-spacer" />
        <button className="adm-app-bar-btn" type="button" aria-label="lock" onClick={logout}>🔒</button>
      </header>

      <main className="adm-content">{children}</main>

      <nav className="adm-tab-bar">
        {TABS.map((t) => {
          const active = path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`adm-tab-item ${active ? "active" : ""}`}>
              <div className="adm-tab-icon">{t.icon}</div>
              <div className="adm-tab-label">
                <span data-sr>{t.label_sr}</span>
                <span data-lat>{t.label_lat}</span>
              </div>
            </Link>
          );
        })}
        {/* Staff has no extras menu; the … button shows only logout */}
        <button type="button" className="adm-tab-item" onClick={() => setMoreOpen(true)}>
          <div className="adm-tab-icon">⋯</div>
          <div className="adm-tab-label">
            <span data-sr>ВИШЕ</span>
            <span data-lat>VIŠE</span>
          </div>
        </button>
      </nav>

      {moreOpen && (
        <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
          <div className="adm-sheet">
            <div className="adm-sheet-handle" />
            <div className="adm-sheet-title">
              <span data-sr>ОСТАЛО</span>
              <span data-lat>OSTALO</span>
            </div>
            <ul className="adm-sheet-list">
              {MORE_LINKS.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} onClick={() => setMoreOpen(false)} className="adm-sheet-item">
                    <span style={{ fontSize: 22, marginRight: 12 }}>{m.icon}</span>
                    <span data-sr>{m.label_sr}</span>
                    <span data-lat>{m.label_lat}</span>
                  </Link>
                </li>
              ))}
              <li className="adm-sheet-divider" />
              <li>
                <button type="button" onClick={logout} className="adm-sheet-item adm-sheet-item-danger">
                  <span style={{ fontSize: 22, marginRight: 12 }}>🚪</span>
                  <span data-sr>ОДЈАВИ СЕ</span>
                  <span data-lat>ODJAVI SE</span>
                </button>
              </li>
              <li className="adm-sheet-meta">
                <span style={{ opacity: 0.6, fontWeight: 600 }}>{session.displayName}</span>
                <span style={{ opacity: 0.35 }}> · {staff ? "Запослен / Zaposlen" : "Власник / Vlasnik"}</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
