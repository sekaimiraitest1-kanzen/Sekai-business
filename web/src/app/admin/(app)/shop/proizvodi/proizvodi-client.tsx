"use client";

import { useRef, useState, useTransition } from "react";
import { compressToWebP } from "@/lib/storage/compress-client";
import { upsertProduct, deleteProduct, uploadProductImage } from "./actions";
import { upsertCategory } from "../kategorije/actions";

type Product = {
  id: string;
  slug: string;
  name_sr: string;
  name_lat: string;
  brand: string | null;
  description_sr: string | null;
  description_lat: string | null;
  price: number;
  category: string | null;
  stock: number;
  active: boolean;
  image_url: string | null;
  badge: string | null;
  sort_order: number;
};

type Category = { slug: string; name_sr: string; name_lat: string };

const LOW_STOCK = 3;

export function ProizvodiClient({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const lowStock = products.filter((p) => p.active && p.stock < LOW_STOCK).length;
  const out = products.filter((p) => p.stock === 0).length;

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>ПРОИЗВОДИ</span><span data-lat>PROIZVODI</span>
          </div>
          <div className="adm-page-subtitle">{products.length} ukupno · {lowStock} na malo · {out} bez zalihe</div>
        </div>
        <button className="adm-fab-btn" onClick={() => setEditing("new")} type="button">+</button>
      </div>

      {lowStock > 0 && (
        <div className="adm-banner warn">
          ⚠ <span data-sr>Низак сток: {lowStock} производ(а) са мање од {LOW_STOCK} комада.</span>
          <span data-lat>Nizak stok: {lowStock} proizvod(a) sa manje od {LOW_STOCK} komada.</span>
        </div>
      )}

      {products.length === 0 && <div className="adm-empty">Nema proizvoda.</div>}

      {products.map((p) => (
        <div key={p.id} className="adm-card" style={{ opacity: p.active ? 1 : 0.5 }} onClick={() => setEditing(p)}>
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt="" style={{ width: 56, height: 56, objectFit: "cover", flexShrink: 0, background: "var(--brown-700)" }} />
          ) : (
            <div style={{ width: 56, height: 56, background: "var(--brown-700)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📦</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 900, fontStyle: "italic", color: "var(--cream)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name_lat}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)", letterSpacing: ".06em", textTransform: "uppercase" }}>{p.brand}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, color: "var(--mustard)", fontWeight: 600 }}>{p.price} RSD</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: p.stock < LOW_STOCK ? "var(--danger)" : "rgba(245,233,208,.4)" }}>
                stock: {p.stock}
              </span>
            </div>
          </div>
          {p.badge && (
            <span style={{ fontSize: 9, padding: "2px 6px", background: "var(--mustard)", color: "var(--brown-950)", letterSpacing: ".08em", fontFamily: "'JetBrains Mono', monospace" }}>
              {p.badge.toUpperCase()}
            </span>
          )}
        </div>
      ))}

      {editing && <ProductEditor product={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} />}
    </>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ProductEditor({ product, categories: initialCategories, onClose }: { product: Product | null; categories: Category[]; onClose: () => void }) {
  // Local copy of categories so the inline "+ NOVA" mini-form can append a
  // newly-created row and auto-select it without forcing a page reload that
  // would lose unsaved product-form input.
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatNameLat, setNewCatNameLat] = useState("");
  const [newCatErr, setNewCatErr] = useState<string | null>(null);
  const [creatingCat, startCatCreate] = useTransition();

  function createCategoryInline() {
    setNewCatErr(null);
    const nameLat = newCatNameLat.trim();
    if (nameLat.length < 2) { setNewCatErr("Ime mora imati bar 2 znaka."); return; }
    const slug = slugify(nameLat);
    if (!slug) { setNewCatErr("Neispravan naziv."); return; }
    if (categories.some((c) => c.slug === slug)) { setNewCatErr("Kategorija sa tim slug-om već postoji."); return; }
    startCatCreate(async () => {
      // English toggle mirrors the Latin name — no separate translation field.
      const res = await upsertCategory({ slug, name_sr: nameLat, name_lat: nameLat, active: true });
      if (!res.ok) {
        setNewCatErr(res.error === "SLUG_TAKEN" ? "Kategorija sa tim slug-om već postoji." : "Greška pri snimanju.");
        return;
      }
      const newCat: Category = { slug, name_sr: nameLat, name_lat: nameLat };
      setCategories((prev) => [...prev, newCat]);
      setCategory(slug);
      setNewCatNameLat("");
      setNewCatOpen(false);
    });
  }

  const [nameLat, setNameLat] = useState(product?.name_lat ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [descLat, setDescLat] = useState(product?.description_lat ?? "");
  const [price, setPrice] = useState(product?.price.toString() ?? "");
  const [stock, setStock] = useState(product?.stock.toString() ?? "0");
  const [category, setCategory] = useState(product?.category ?? categories[0]?.slug ?? "");
  const [badge, setBadge] = useState<string>(product?.badge ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const productId = product?.id;
    if (!productId) {
      alert("Sačuvaj prvo proizvod, pa onda dodaj sliku.");
      return;
    }
    setUploading(true);
    try {
      const { blob, filename } = await compressToWebP(f);
      const fd = new FormData();
      fd.append("productId", productId);
      fd.append("filename", filename);
      fd.append("file", blob, filename);
      const res = await uploadProductImage(fd);
      if (res.ok) setImageUrl(res.url);
      else alert(`Upload nije uspeo: ${res.error}`);
    } catch (err) {
      console.error("[upload] failed:", err);
      alert(`Greška: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save() {
    start(async () => {
      const slug = product?.slug ?? slugify(nameLat);
      await upsertProduct({
        id: product?.id,
        slug,
        // English toggle mirrors the Latin text — no separate translation field.
        name_sr: nameLat.trim(),
        name_lat: nameLat.trim(),
        brand: brand.trim() || undefined,
        description_sr: descLat.trim() || undefined,
        description_lat: descLat.trim() || undefined,
        price: parseInt(price) || 0,
        category: category || undefined,
        stock: parseInt(stock) || 0,
        active,
        badge: (badge || null) as ProductInput["badge"],
      });
      onClose();
    });
  }

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">
          {product ? "IZMENI PROIZVOD" : "NOVI PROIZVOD"}
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" style={{ width: "100%", height: 180, objectFit: "cover", background: "var(--brown-900)" }} />
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadImg} style={{ display: "none" }} />
          <button className="adm-btn adm-btn-secondary" type="button" disabled={uploading || !product?.id} onClick={() => fileRef.current?.click()}>
            {uploading ? "UPLOADING…" : product?.id ? "📷 IZMENI SLIKU" : "💡 SAČUVAJ PRVO"}
          </button>

          <label className="adm-form-label">NAZIV</label>
          <input className="adm-input" value={nameLat} onChange={(e) => setNameLat(e.target.value)} placeholder="Pomada Batajnica" />
          <label className="adm-form-label">BRAND</label>
          <input className="adm-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="VUK" />
          <label className="adm-form-label">OPIS</label>
          <textarea className="adm-input" rows={2} value={descLat} onChange={(e) => setDescLat(e.target.value)} placeholder="Strong hold, matte finish…" />

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="adm-form-label">CENA (RSD)</label>
              <input className="adm-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="adm-form-label">STOCK</label>
              <input className="adm-input" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>

          <label className="adm-form-label">KATEGORIJA</label>
          <div style={{ display: "flex", gap: 6 }}>
            <select className="adm-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ flex: 1 }}>
              <option value="">— bez kategorije —</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name_lat}</option>)}
            </select>
            <button
              type="button"
              className="adm-btn-secondary"
              onClick={() => { setNewCatOpen((v) => !v); setNewCatErr(null); }}
              disabled={creatingCat}
              style={{ fontSize: 12, padding: "0 12px", whiteSpace: "nowrap" }}
              title="Dodaj novu kategoriju (vidljiva odmah na sajtu)"
            >
              {newCatOpen ? "✕" : "+ NOVA"}
            </button>
          </div>
          {newCatOpen && (
            <div style={{ marginTop: 8, padding: 12, background: "rgba(212,165,58,.06)", border: "1px solid rgba(212,165,58,.2)", borderRadius: 4, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
                Nova kategorija
              </div>
              <input
                className="adm-input"
                placeholder="Naziv, npr. Brijanje"
                value={newCatNameLat}
                onChange={(e) => setNewCatNameLat(e.target.value)}
                disabled={creatingCat}
                maxLength={40}
              />
              {newCatErr && <div style={{ color: "#ffb0b0", fontSize: 12 }}>{newCatErr}</div>}
              <button type="button" className="adm-btn" onClick={createCategoryInline} disabled={creatingCat || !newCatNameLat.trim()} style={{ fontSize: 12 }}>
                {creatingCat ? "..." : "DODAJ KATEGORIJU"}
              </button>
              <div style={{ fontSize: 10, color: "rgba(245,233,208,.5)" }}>
                Slug se generiše automatski. Kategorija se odmah prikaže na sajtu.
              </div>
            </div>
          )}

          <label className="adm-form-label">BADGE</label>
          <select className="adm-input" value={badge} onChange={(e) => setBadge(e.target.value)}>
            <option value="">— bez badge —</option>
            <option value="new">NEW</option>
            <option value="hot">HOT</option>
            <option value="vuk">VUK</option>
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--cream)", fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            AKTIVAN (vidljiv u shop-u)
          </label>

          <button className="adm-btn adm-btn-block" disabled={pending || !nameLat || !price} onClick={save}>SAČUVAJ</button>
          {product && (
            <button className="adm-btn adm-btn-danger adm-btn-block" disabled={pending} onClick={() => {
              if (confirm(`Obrisi "${product.name_lat}"?`)) start(async () => { await deleteProduct(product.id); onClose(); });
            }}>OBRIŠI</button>
          )}
          <button className="adm-btn adm-btn-secondary adm-btn-block" onClick={onClose}>OTKAŽI</button>
        </div>
      </div>
    </div>
  );
}

type ProductInput = {
  id?: string;
  slug: string;
  name_sr: string;
  name_lat: string;
  brand?: string;
  description_sr?: string;
  description_lat?: string;
  price: number;
  category?: string;
  stock: number;
  active: boolean;
  badge?: "new" | "hot" | "vuk" | null;
};
