"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ShopSubNav() {
  const path = usePathname();
  const tabs = [
    { href: "/admin/shop/proizvodi", sr: "ПРОИЗВОДИ", lat: "PROIZVODI" },
    { href: "/admin/shop/kategorije", sr: "КАТЕГОРИЈЕ", lat: "KATEGORIJE" },
    { href: "/admin/shop/porudzbine", sr: "ПОРУЏБИНЕ", lat: "PORUDŽBINE" },
  ];
  return (
    <div className="adm-toggle" style={{ marginBottom: 16 }}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={`adm-toggle-opt ${path.startsWith(t.href) ? "active" : ""}`} style={{ textDecoration: "none", textAlign: "center" }}>
          <span data-sr>{t.sr}</span><span data-lat>{t.lat}</span>
        </Link>
      ))}
    </div>
  );
}
