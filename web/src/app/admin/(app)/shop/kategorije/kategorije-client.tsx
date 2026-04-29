"use client";

import { useState, useTransition } from "react";
import { upsertCategory, deleteCategory } from "./actions";

type Category = {
  id: string;
  slug: string;
  name_sr: string;
  name_lat: string;
  active: boolean;
  sort_order: number;
};

export function KategorijeClient({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>КАТЕГОРИЈЕ</span><span data-lat>KATEGORIJE</span>
          </div>
          <div className="adm-page-subtitle">{categories.length} ukupno</div>
        </div>
        <button className="adm-fab-btn" onClick={() => setEditing("new")} type="button">+</button>
      </div>

      {categories.map((c) => (
        <div key={c.id} className="adm-card" style={{ opacity: c.active ? 1 : 0.5 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--cream)", letterSpacing: ".06em", textTransform: "uppercase" }}>
              <span data-sr>{c.name_sr}</span><span data-lat>{c.name_lat}</span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)" }}>{c.slug}</div>
          </div>
          <button className="adm-app-bar-btn" type="button" onClick={() => setEditing(c)}>✎</button>
        </div>
      ))}

      {editing && <CategoryEditor category={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function CategoryEditor({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const [sr, setSr] = useState(category?.name_sr ?? "");
  const [lat, setLat] = useState(category?.name_lat ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [active, setActive] = useState(category?.active ?? true);
  const [pending, start] = useTransition();

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet">
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">{category ? "IZMENI KATEGORIJU" : "NOVA KATEGORIJA"}</div>
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="adm-form-label">NAZIV (ćir.)</label>
          <input className="adm-input" value={sr} onChange={(e) => { setSr(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} />
          <label className="adm-form-label">NAZIV (lat.)</label>
          <input className="adm-input" value={lat} onChange={(e) => setLat(e.target.value)} />
          <label className="adm-form-label">SLUG (URL)</label>
          <input className="adm-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pomade" />
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--cream)" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> AKTIVNA
          </label>
          <button className="adm-btn adm-btn-block" disabled={pending || !sr || !lat || !slug} onClick={() => start(async () => { await upsertCategory({ id: category?.id, slug, name_sr: sr, name_lat: lat, active }); onClose(); })}>SAČUVAJ</button>
          {category && <button className="adm-btn adm-btn-danger adm-btn-block" disabled={pending} onClick={() => { if (confirm(`Obrisi ${category.name_lat}?`)) start(async () => { await deleteCategory(category.id); onClose(); }); }}>OBRIŠI</button>}
          <button className="adm-btn adm-btn-secondary adm-btn-block" onClick={onClose}>OTKAŽI</button>
        </div>
      </div>
    </div>
  );
}
