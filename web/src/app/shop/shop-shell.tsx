"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { useCart } from "@/lib/shop/cart-context";
import { useCartFly } from "@/lib/shop/cart-fly";
import { submitOrder } from "./actions";
import { trackEvent, trackRevenue, EVENTS } from "@/lib/plausible";

/**
 * Shared shell for /shop/* — top nav with cart count, slide-in cart drawer,
 * and checkout flow. List + detail pages render inside <main>.
 */
export function ShopShell({ children }: { children: React.ReactNode }) {
  const cart = useCart();
  const fly = useCartFly();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderDone, setOrderDone] = useState<string | null>(null);
  const cartBtnRef = useRef<HTMLButtonElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);
  const prevCountRef = useRef(cart.count);
  const skipFirstPopRef = useRef(true);

  // Wire the cart-icon target so flyToCart knows where to land.
  useEffect(() => {
    fly.registerCartTarget(cartBtnRef.current);
    return () => fly.registerCartTarget(null);
  }, [fly]);

  // Wire the toast's "OPEN" CTA to the existing drawer state.
  useEffect(() => {
    fly.setOpenCartHandler(() => setCartOpen(true));
  }, [fly]);

  // Spring-pop the count badge only on user-driven increments. The first
  // run after mount is the localStorage-hydration jump (0 → restored) — we
  // skip it so the badge doesn't bounce on every page reload.
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = cart.count;
    if (skipFirstPopRef.current) {
      skipFirstPopRef.current = false;
      return;
    }
    const el = countRef.current;
    if (!el) return;
    if (cart.count > prev) {
      el.classList.remove("cart-count-pop");
      void el.offsetWidth;
      el.classList.add("cart-count-pop");
    }
  }, [cart.count]);

  return (
    <div className="sh-page">
      <nav className="sh-nav">
        <Link href="/" className="sh-nav-logo">
          <div className="sh-nav-logo-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-120.png" alt="Barbershop Vuk" width={120} height={120} />
          </div>
          <div className="sh-nav-logo-text">
            <span data-sr>Barbershop Vuk</span>
            <span data-lat>Barbershop Vuk</span>
            <span>EST 2024</span>
          </div>
        </Link>
        <Link href="/" className="sh-nav-back" style={{ marginLeft: 16 }}>
          ← <span data-sr>HOME</span><span data-lat>POČETNA</span>
        </Link>
        <div className="sh-nav-spacer" />
        <LangToggle />
        <button
          ref={cartBtnRef}
          className="sh-nav-cart-btn"
          onClick={() => setCartOpen(true)}
          type="button"
          aria-label="Open cart"
        >
          🛒 <span data-sr>CART</span><span data-lat>KORPA</span>
          <span ref={countRef} className="sh-cart-count">{cart.count}</span>
        </button>
      </nav>

      <main id="main-content">{children}</main>

      {cartOpen && (
        <CartDrawer
          onClose={() => setCartOpen(false)}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      )}

      {checkoutOpen && (
        <CheckoutDrawer
          onClose={() => setCheckoutOpen(false)}
          onSuccess={(id) => { cart.clear(); setCheckoutOpen(false); setOrderDone(id); }}
        />
      )}

      {orderDone && (
        <div className="cart-overlay open" onClick={() => setOrderDone(null)}>
          <div className="cart-drawer" style={{ maxWidth: 480, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontStyle: "italic", color: "var(--brown-950)", marginBottom: 8 }}>
              <span data-sr>Thank you!</span><span data-lat>Hvala!</span>
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--brown-700)", marginBottom: 16 }}>
              <span data-sr>Your order has been sent. We will contact you for pickup.</span>
              <span data-lat>Porudžbina je poslata. Kontaktiraćemo vas radi preuzimanja.</span>
            </p>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--brown-700)", opacity: 0.5, marginBottom: 16 }}>
              ID: {orderDone.slice(0, 8).toUpperCase()}
            </div>
            <button className="sh-btn-primary" onClick={() => setOrderDone(null)} style={{ width: "auto" }}>
              <span data-sr>OK</span><span data-lat>OK</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CartDrawer({ onClose, onCheckout }: { onClose: () => void; onCheckout: () => void }) {
  const cart = useCart();
  return (
    <div className="cart-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cart-drawer">
        <div className="cart-header">
          <h2 className="cart-title" data-sr>CART</h2>
          <h2 className="cart-title" data-lat>KORPA</h2>
          <button className="cart-close" onClick={onClose} type="button" aria-label="Close cart">✕</button>
        </div>
        {cart.items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, fontFamily: "'JetBrains Mono', monospace", color: "rgba(92,58,34,.5)" }}>
            <span data-sr>Your cart is empty.</span>
            <span data-lat>Korpa je prazna.</span>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.items.map((it) => (
                <div key={it.productId} className="cart-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontStyle: "italic", color: "var(--brown-950)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--mustard)" }}>{it.price} RSD × {it.quantity} = {it.price * it.quantity} RSD</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => cart.setQty(it.productId, it.quantity - 1)} aria-label="decrease" style={{ background: "var(--brown-950)", color: "var(--cream)", border: "none", width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>−</button>
                    <span style={{ minWidth: 20, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{it.quantity}</span>
                    <button onClick={() => cart.setQty(it.productId, it.quantity + 1)} aria-label="increase" style={{ background: "var(--mustard)", color: "var(--brown-950)", border: "none", width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(92,58,34,.15)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--brown-700)", letterSpacing: ".1em", textTransform: "uppercase" }}>UKUPNO</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontStyle: "italic", color: "var(--mustard)" }}>{cart.total} RSD</span>
            </div>
            <button className="sh-btn-primary" onClick={onCheckout} style={{ width: "calc(100% - 40px)", margin: "0 20px 20px" }}>
              <span data-sr>CONTINUE TO CONFIRM →</span>
              <span data-lat>NASTAVI DO POTVRDE →</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CheckoutDrawer({ onClose, onSuccess }: { onClose: () => void; onSuccess: (orderId: string) => void }) {
  const cart = useCart();
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
        items: cart.items.map((it) => ({ productId: it.productId, name: it.name, quantity: it.quantity, price: it.price })),
        pickupNote: note,
      });
      if (res.ok) {
        const totalRsd = cart.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const itemCount = cart.items.reduce((n, it) => n + it.quantity, 0);
        trackRevenue(EVENTS.ORDER_PLACED, totalRsd, {
          itemCount,
          hasEmail: !!email,
        });
        onSuccess(res.orderId);
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <div className="cart-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cart-drawer">
        <div className="cart-header">
          <h2 className="cart-title" data-sr>PICKUP DETAILS</h2>
          <h2 className="cart-title" data-lat>PODACI ZA PREUZIMANJE</h2>
          <button className="cart-close" onClick={onClose} type="button" aria-label="Back">←</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="form-input" placeholder="Ime i prezime" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
          <input className="form-input" placeholder="+381 6X XXX XX XX" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%" }} />
          <input className="form-input" placeholder="E-mail (opciono)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
          <textarea className="form-input" rows={3} placeholder="Napomena (kad dolaziš da preuzmeš…)" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: "100%" }} />

          <div style={{ padding: 12, background: "var(--cream)", marginTop: 4 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--brown-700)", marginBottom: 8 }}>{cart.items.length} stavk(i):</div>
            {cart.items.map((it) => (
              <div key={it.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--brown-950)" }}>
                <span>{it.quantity} × {it.name}</span>
                <span style={{ color: "var(--mustard)" }}>{it.price * it.quantity} RSD</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(92,58,34,.15)", marginTop: 8, paddingTop: 8 }}>
              <strong style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: ".08em" }}>TOTAL</strong>
              <strong style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "var(--mustard)", fontSize: 20 }}>{cart.total} RSD</strong>
            </div>
          </div>

          {err && <div style={{ color: "var(--danger)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{err}</div>}

          <button className="sh-btn-primary" disabled={pending || !name || phone.length < 6 || cart.items.length === 0} onClick={go} style={{ width: "100%" }}>
            {pending ? "..." : <><span data-sr>CONFIRM ORDER →</span><span data-lat>POTVRDI PORUDŽBINU →</span></>}
          </button>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--brown-700)", textAlign: "center", opacity: 0.6 }}>
            <span data-sr>No online payment — you pay in the salon on pickup.</span>
            <span data-lat>Bez online plaćanja — plaćaš u salonu pri preuzimanju.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
