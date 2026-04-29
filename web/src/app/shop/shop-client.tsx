"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { submitOrder } from "./actions";

type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  price: number;
  category: string | null;
  stock: number;
  image_url: string | null;
  badge: string | null;
};
type Category = { slug: string; name_sr: string; name_lat: string };
type CartItem = { productId: string; name: string; price: number; quantity: number; image_url: string | null };

export function ShopClient({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [filter, setFilter] = useState<string>("sve");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [orderDone, setOrderDone] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "sve") return products;
    return products.filter((p) => p.category === filter);
  }, [filter, products]);

  function addToCart(p: Product) {
    setCart((c) => {
      const existing = c.find((i) => i.productId === p.id);
      if (existing) {
        return c.map((i) => (i.productId === p.id ? { ...i, quantity: Math.min(i.quantity + 1, p.stock) } : i));
      }
      return [...c, { productId: p.id, name: p.name, price: p.price, quantity: 1, image_url: p.image_url }];
    });
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) {
      setCart((c) => c.filter((i) => i.productId !== productId));
    } else {
      setCart((c) => c.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
    }
  }

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="sh-page">
      <nav className="sh-nav">
        <Link href="/" className="sh-nav-logo">
          <div className="sh-nav-logo-mark">Т</div>
          <div className="sh-nav-logo-text">
            <span data-sr>Берберница Триша</span><span data-lat>Berbernica Triša</span>
            <span>EST 2025</span>
          </div>
        </Link>
        <Link href="/" className="sh-nav-back" style={{ marginLeft: 16 }}>
          ← <span data-sr>ПОЧЕТНА</span><span data-lat>POČETNA</span>
        </Link>
        <div className="sh-nav-spacer" />
        <LangToggle />
        <button className="sh-nav-cart-btn" onClick={() => setCartOpen(true)} type="button">
          🛒 <span data-sr>КОРПА</span><span data-lat>KORPA</span>
          <span className="sh-cart-count">{cartCount}</span>
        </button>
      </nav>

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
            <div key={p.id} className={`product-card ${out ? "out-of-stock" : ""}`}>
              <div className="product-img">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div className="product-img-placeholder">
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 32, color: "rgba(245,233,208,.06)", letterSpacing: ".1em" }}>{p.brand ?? p.name.slice(0, 5).toUpperCase()}</div>
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
                <div className="product-name">{p.name}</div>
                <div className="product-footer">
                  <div className="product-price">{p.price}<span>RSD</span></div>
                  <button
                    className="product-cta"
                    type="button"
                    aria-label={`Dodaj ${p.name} u korpu`}
                    disabled={out}
                    onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {cartOpen && (
        <CartDrawer
          items={cart}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onUpdate={updateQty}
          onCheckout={() => { setCartOpen(false); setCheckout(true); }}
        />
      )}

      {checkout && (
        <CheckoutDrawer
          items={cart}
          total={cartTotal}
          onClose={() => setCheckout(false)}
          onSuccess={(id) => { setCart([]); setCheckout(false); setOrderDone(id); }}
        />
      )}

      {orderDone && (
        <div className="cart-overlay open" onClick={() => setOrderDone(null)}>
          <div className="cart-drawer" style={{ maxWidth: 480, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontStyle: "italic", color: "var(--brown-950)", marginBottom: 8 }}>
              <span data-sr>Хвала!</span><span data-lat>Hvala!</span>
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--brown-700)", marginBottom: 16 }}>
              <span data-sr>Поруџбина је послата. Триша ће вас контактирати ради преузимања.</span>
              <span data-lat>Porudžbina je poslata. Triša će vas kontaktirati radi preuzimanja.</span>
            </p>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--brown-700)", opacity: 0.5, marginBottom: 16 }}>
              ID: {orderDone.slice(0, 8).toUpperCase()}
            </div>
            <button className="sh-btn-primary" onClick={() => setOrderDone(null)} style={{ width: "auto" }}>
              <span data-sr>ОК</span><span data-lat>OK</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CartDrawer({ items, total, onClose, onUpdate, onCheckout }: {
  items: CartItem[];
  total: number;
  onClose: () => void;
  onUpdate: (id: string, qty: number) => void;
  onCheckout: () => void;
}) {
  return (
    <div className="cart-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cart-drawer">
        <div className="cart-header">
          <h2 className="cart-title" data-sr>КОРПА</h2>
          <h2 className="cart-title" data-lat>KORPA</h2>
          <button className="cart-close" onClick={onClose} type="button">✕</button>
        </div>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, fontFamily: "'JetBrains Mono', monospace", color: "rgba(92,58,34,.5)" }}>
            <span data-sr>Корпа је празна.</span>
            <span data-lat>Korpa je prazna.</span>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((it) => (
                <div key={it.productId} className="cart-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontStyle: "italic", color: "var(--brown-950)" }}>{it.name}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--mustard)" }}>{it.price} RSD</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => onUpdate(it.productId, it.quantity - 1)} style={{ background: "var(--brown-950)", color: "var(--cream)", border: "none", width: 24, height: 24, cursor: "pointer" }}>-</button>
                    <span style={{ minWidth: 20, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{it.quantity}</span>
                    <button onClick={() => onUpdate(it.productId, it.quantity + 1)} style={{ background: "var(--mustard)", color: "var(--brown-950)", border: "none", width: 24, height: 24, cursor: "pointer" }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(92,58,34,.15)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--brown-700)", letterSpacing: ".1em", textTransform: "uppercase" }}>UKUPNO</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontStyle: "italic", color: "var(--mustard)" }}>{total} RSD</span>
            </div>
            <button className="sh-btn-primary" onClick={onCheckout} style={{ width: "calc(100% - 40px)", margin: "0 20px 20px" }}>
              <span data-sr>НАСТАВИ ДО ПОТВРДЕ →</span><span data-lat>NASTAVI DO POTVRDE →</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CheckoutDrawer({ items, total, onClose, onSuccess }: {
  items: CartItem[];
  total: number;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function go() {
    setErr(null);
    start(async () => {
      const res = await submitOrder({
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        items: items.map((it) => ({ productId: it.productId, name: it.name, quantity: it.quantity, price: it.price })),
        pickupNote: note,
      });
      if (res.ok) onSuccess(res.orderId);
      else setErr(res.error);
    });
  }

  return (
    <div className="cart-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cart-drawer">
        <div className="cart-header">
          <h2 className="cart-title" data-sr>ПОДАЦИ ЗА ПРЕУЗИМАЊЕ</h2>
          <h2 className="cart-title" data-lat>PODACI ZA PREUZIMANJE</h2>
          <button className="cart-close" onClick={onClose} type="button">←</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="form-input" placeholder="Ime i prezime" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
          <input className="form-input" placeholder="+381 6X XXX XX XX" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%" }} />
          <input className="form-input" placeholder="E-mail (opciono)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
          <textarea className="form-input" rows={3} placeholder="Napomena (kad dolaziš da preuzmeš…)" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: "100%" }} />

          <div style={{ padding: 12, background: "var(--cream)", marginTop: 4 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--brown-700)", marginBottom: 8 }}>{items.length} stavk(e):</div>
            {items.map((it) => (
              <div key={it.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--brown-950)" }}>
                <span>{it.quantity} × {it.name}</span>
                <span style={{ color: "var(--mustard)" }}>{it.price * it.quantity} RSD</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(92,58,34,.15)", marginTop: 8, paddingTop: 8 }}>
              <strong style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: ".08em" }}>TOTAL</strong>
              <strong style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "var(--mustard)", fontSize: 20 }}>{total} RSD</strong>
            </div>
          </div>

          {err && <div style={{ color: "var(--danger)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{err}</div>}

          <button className="sh-btn-primary" disabled={pending || !name || phone.length < 6} onClick={go} style={{ width: "100%" }}>
            {pending ? "..." : <><span data-sr>ПОТВРДИ ПОРУЏБИНУ →</span><span data-lat>POTVRDI PORUDŽBINU →</span></>}
          </button>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--brown-700)", textAlign: "center", opacity: 0.6 }}>
            <span data-sr>Без онлине плаћања — плаћаш у салону при преузимању.</span>
            <span data-lat>Bez online plaćanja — plaćaš u salonu pri preuzimanju.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
