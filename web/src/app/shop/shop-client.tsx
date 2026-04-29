"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/shop/cart-context";

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
  image_url: string | null;
  badge: string | null;
};
type Category = { slug: string; name_sr: string; name_lat: string };

export function ShopClient({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [filter, setFilter] = useState<string>("sve");
  const cart = useCart();

  const filtered = useMemo(() => {
    if (filter === "sve") return products;
    return products.filter((p) => p.category === filter);
  }, [filter, products]);

  return (
    <>
      <div className="shop-hero">
        <div className="shop-hero-inner">
          <div>
            <div className="shop-eyebrow" data-sr>§ ПРОДАВНИЦА · КОЗМЕТИКА</div>
            <div className="shop-eyebrow" data-lat>§ PRODAVNICA · KOZMETIKA</div>
            <h1 className="shop-title" data-sr>Стил и код<br/>куће.</h1>
            <h1 className="shop-title" data-lat>Stil i kod<br/>kuće.</h1>
            <p className="shop-sub" data-sr>Препарати за негу косе, коже и браде. Само лично преузимање у салону — без доставе.</p>
            <p className="shop-sub" data-lat>Preparati za negu kose, kože i brade. Samo lično preuzimanje u salonu — bez dostave.</p>
          </div>
          <div className="shop-stats">
            <div>
              <div className="shop-stat-val">{products.length}</div>
              <div className="shop-stat-label" data-sr>ПРОИЗВОДА</div>
              <div className="shop-stat-label" data-lat>PROIZVODA</div>
            </div>
            <div>
              <div className="shop-stat-val">✓</div>
              <div className="shop-stat-label" data-sr>САМО PICKUP</div>
              <div className="shop-stat-label" data-lat>SAMO PICKUP</div>
            </div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <button className={`filter-chip ${filter === "sve" ? "active" : ""}`} onClick={() => setFilter("sve")} type="button">
          <span data-sr>СВЕ</span><span data-lat>SVE</span>
        </button>
        {categories.map((c) => (
          <button key={c.slug} className={`filter-chip ${filter === c.slug ? "active" : ""}`} onClick={() => setFilter(c.slug)} type="button">
            <span data-sr>{c.name_sr.toUpperCase()}</span>
            <span data-lat>{c.name_lat.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="products-section">
        <div className="section-divider">
          <div className="section-divider-label" data-sr>СВИ ПРОИЗВОДИ</div>
          <div className="section-divider-label" data-lat>SVI PROIZVODI</div>
          <div className="section-divider-line"></div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--brown-700)", letterSpacing: ".06em" }}>
            <span data-sr>{filtered.length} НА СТОКУ</span>
            <span data-lat>{filtered.length} NA STOKU</span>
          </div>
        </div>

        <div className="products-grid">
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 64, fontFamily: "'JetBrains Mono', monospace", color: "var(--brown-700)" }}>
              <span data-sr>Нема производа у овој категорији.</span>
              <span data-lat>Nema proizvoda u ovoj kategoriji.</span>
            </div>
          )}
          {filtered.map((p) => {
            const out = p.stock <= 0;
            return (
              <Link
                key={p.id}
                href={`/shop/${p.slug}`}
                className={`product-card ${out ? "out-of-stock" : ""}`}
                aria-label={`${p.brand ? p.brand + " — " : ""}${p.name_lat}, ${p.price} RSD`}
              >
                <div className="product-img">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name_lat} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div className="product-img-placeholder">
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 32, color: "rgba(245,233,208,.06)", letterSpacing: ".1em" }}>{p.brand ?? p.name_lat.slice(0, 5).toUpperCase()}</div>
                    </div>
                  )}
                  {p.badge && <div className={`product-badge badge-${p.badge}`}>{p.badge.toUpperCase()}</div>}
                  {out && (
                    <div className="product-out-overlay">
                      <span data-sr>РАСПРОДАТО</span>
                      <span data-lat>RASPRODATO</span>
                    </div>
                  )}
                </div>
                <div className="product-body">
                  {p.brand && <div className="product-brand-tag">{p.brand}</div>}
                  <div className="product-name" data-sr>{p.name_sr}</div>
                  <div className="product-name" data-lat>{p.name_lat}</div>
                  <div className="product-footer">
                    <div className="product-price">{p.price}<span>RSD</span></div>
                    <button
                      className="product-cta"
                      type="button"
                      aria-label={`Dodaj ${p.name_lat} u korpu`}
                      disabled={out}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        cart.add(
                          { productId: p.id, slug: p.slug, name: p.name_lat, price: p.price, image_url: p.image_url },
                          1,
                          p.stock
                        );
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
