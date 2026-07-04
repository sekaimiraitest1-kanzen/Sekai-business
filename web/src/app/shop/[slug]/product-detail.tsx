"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCart } from "@/lib/shop/cart-context";
import { useCartFly } from "@/lib/shop/cart-fly";

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

type Related = {
  id: string;
  slug: string;
  name_sr: string;
  name_lat: string;
  brand: string | null;
  price: number;
  image_url: string | null;
  badge: string | null;
  stock: number;
};

export function ProductDetail({ product, related }: { product: Product; related: Related[] }) {
  const cart = useCart();
  const fly = useCartFly();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);
  const out = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock < 5;

  function handleAdd() {
    cart.add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name_lat,
        price: product.price,
        image_url: product.image_url,
      },
      qty,
      product.stock
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);

    // Detail page: launch ghost from the hero image (the user's focal point)
    // so the spatial mapping image → cart is unambiguous.
    const src = imageRef.current ?? addBtnRef.current;
    if (src) {
      fly.flyToCart({
        sourceEl: src,
        imageUrl: product.image_url,
        productName: product.name_lat,
        qty,
        priceTotal: product.price * qty,
        fallbackInitial: (product.brand ?? product.name_lat).charAt(0),
      });
    }
    const btn = addBtnRef.current;
    if (btn) {
      btn.classList.remove("cart-cta-success");
      void btn.offsetWidth;
      btn.classList.add("cart-cta-success");
      window.setTimeout(() => btn.classList.remove("cart-cta-success"), 520);
    }
  }

  return (
    <div className="pd-page">
      <div className="pd-breadcrumbs">
        <Link href="/shop" style={{ color: "inherit", textDecoration: "none" }}>
          ← <span data-sr>ALL PRODUCTS</span>
          <span data-lat>SVI PROIZVODI</span>
        </Link>
      </div>

      <article className="pd-grid">
        <div className="pd-image-col">
          <div className="pd-image" ref={imageRef}>
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={`${product.name_lat}${product.brand ? " — " + product.brand : ""} | Barbershop Vuk`}
                width={800}
                height={800}
              />
            ) : (
              <div className="pd-image-placeholder">
                <div className="pd-placeholder-brand">{product.brand ?? product.name_lat.slice(0, 5).toUpperCase()}</div>
                <div className="pd-placeholder-meta" data-sr>FOTOGRAFIJA STIŽE</div>
                <div className="pd-placeholder-meta" data-lat>FOTOGRAFIJA STIŽE</div>
              </div>
            )}
            {product.badge && (
              <div className={`product-badge badge-${product.badge}`} style={{ top: 16, left: 16 }}>
                {product.badge.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="pd-info">
          {product.brand && <div className="pd-brand">{product.brand}</div>}
          <h1 className="pd-name" data-sr>{product.name_sr}</h1>
          <h1 className="pd-name" data-lat>{product.name_lat}</h1>

          <div className="pd-stock">
            {out ? (
              <span className="pd-stock-out">
                <span data-sr>SOLD OUT</span><span data-lat>RASPRODATO</span>
              </span>
            ) : lowStock ? (
              <span className="pd-stock-low">
                <span data-sr>● Only {product.stock} left in stock</span>
                <span data-lat>● Samo {product.stock} na stanju</span>
              </span>
            ) : (
              <span className="pd-stock-ok">
                <span data-sr>● In stock</span>
                <span data-lat>● Na stanju</span>
              </span>
            )}
          </div>

          {product.description_sr && (
            <div className="pd-desc" data-sr>{product.description_sr}</div>
          )}
          {product.description_lat && (
            <div className="pd-desc" data-lat>{product.description_lat}</div>
          )}

          <div className="pd-price-row">
            <div className="pd-price">
              {(product.price * qty).toLocaleString("sr-RS")}
              <span>RSD</span>
            </div>
            {qty > 1 && (
              <div className="pd-unit-price">
                <span data-sr>{product.price} RSD per item</span>
                <span data-lat>{product.price} RSD po komadu</span>
              </div>
            )}
          </div>

          <div className="pd-qty-row">
            <label className="pd-qty-label">
              <span data-sr>QUANTITY</span>
              <span data-lat>KOLIČINA</span>
            </label>
            <div className="pd-qty">
              <button
                type="button"
                className="pd-qty-btn"
                disabled={out || qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                className="pd-qty-input"
                value={qty}
                min={1}
                max={product.stock}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (Number.isFinite(v)) setQty(Math.max(1, Math.min(product.stock, v)));
                }}
                disabled={out}
              />
              <button
                type="button"
                className="pd-qty-btn"
                disabled={out || qty >= product.stock}
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                aria-label="increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <button
            ref={addBtnRef}
            type="button"
            className="pd-add-btn"
            disabled={out}
            onClick={handleAdd}
          >
            {added ? (
              <>✓ <span data-sr>ADDED TO CART</span><span data-lat>DODATO U KORPU</span></>
            ) : out ? (
              <><span data-sr>SOLD OUT</span><span data-lat>RASPRODATO</span></>
            ) : (
              <><span data-sr>ADD TO CART →</span><span data-lat>DODAJ U KORPU →</span></>
            )}
          </button>

          <div className="pd-meta">
            <div className="pd-meta-row">
              <span className="pd-meta-label" data-sr>PAYMENT</span>
              <span className="pd-meta-label" data-lat>PLAĆANJE</span>
              <span className="pd-meta-value" data-sr>Cash or card in the salon</span>
              <span className="pd-meta-value" data-lat>Gotovina ili kartica u salonu</span>
            </div>
            <div className="pd-meta-row">
              <span className="pd-meta-label" data-sr>PICKUP</span>
              <span className="pd-meta-label" data-lat>PREUZIMANJE</span>
              <span className="pd-meta-value" data-sr>In person at Barbershop Vuk</span>
              <span className="pd-meta-value" data-lat>Lično u Barbershop Vuk</span>
            </div>
            <div className="pd-meta-row">
              <span className="pd-meta-label" data-sr>DELIVERY</span>
              <span className="pd-meta-label" data-lat>DOSTAVA</span>
              <span className="pd-meta-value" data-sr>Not available yet — pickup only</span>
              <span className="pd-meta-value" data-lat>Trenutno nema — samo pickup</span>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="pd-related">
          <div className="section-divider">
            <div className="section-divider-label" data-sr>SIMILAR PRODUCTS</div>
            <div className="section-divider-label" data-lat>SLIČNI PROIZVODI</div>
            <div className="section-divider-line" />
          </div>
          <div className="products-grid">
            {related.map((r) => {
              const o = r.stock <= 0;
              return (
                <Link key={r.id} href={`/shop/${r.slug}`} className={`product-card ${o ? "out-of-stock" : ""}`}>
                  <div className="product-img">
                    {r.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image_url} alt={r.name_lat} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div className="product-img-placeholder">
                        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, color: "rgba(245,233,208,.06)", letterSpacing: ".1em" }}>{r.brand ?? r.name_lat.slice(0, 5).toUpperCase()}</div>
                      </div>
                    )}
                    {r.badge && <div className={`product-badge badge-${r.badge}`}>{r.badge.toUpperCase()}</div>}
                  </div>
                  <div className="product-body">
                    {r.brand && <div className="product-brand-tag">{r.brand}</div>}
                    <div className="product-name" data-sr>{r.name_sr}</div>
                    <div className="product-name" data-lat>{r.name_lat}</div>
                    <div className="product-footer">
                      <div className="product-price">{r.price}<span>RSD</span></div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
