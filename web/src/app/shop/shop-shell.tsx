"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { useCart } from "@/lib/shop/cart-context";
import { submitOrder } from "./actions";
import { trackEvent, trackRevenue, EVENTS } from "@/lib/plausible";

/**
 * Shared shell for /shop/* — top nav with cart count, slide-in cart drawer,
 * and checkout flow. List + detail pages render inside <main>.
 */
export function ShopShell({ children }: { children: React.ReactNode }) {
  const cart = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderDone, setOrderDone] = useState<string | null>(null);

  return (
    <div className="sh-page">
      <nav className="sh-nav">
        <Link href="/" className="sh-nav-logo">
          <div className="sh-nav-logo-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-120.png" alt="Berbernica Triša" width={120} height={120} />
          </div>
          <div className="sh-nav-logo-text">
            <span data-sr>Берберница Триша</span>
            <span data-lat>Berbernica Triša</span>
            <span>EST 2025</span>
          </div>
        </Link>
        <Link href="/" className="sh-nav-back" style={{ marginLeft: 16 }}>
          ← <span data-sr>ПОЧЕТНА</span><span data-lat>POČETNA</span>
        </Link>
        <div className="sh-nav-spacer" />
        <LangToggle />
        <button className="sh-nav-cart-btn" onClick={() => setCartOpen(true)} type="button" aria-label="Open cart">
          🛒 <span data-sr>КОРПА</span><span data-lat>KORPA</span>
          <span className="sh-cart-count">{cart.count}</span>
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

function CartDrawer({ onClose, onCheckout }: { onClose: () => void; onCheckout: () => void }) {
  const cart = useCart();
  return (
    <div className="cart-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cart-drawer">
        <div className="cart-header">
          <h2 className="cart-title" data-sr>КОРПА</h2>
          <h2 className="cart-title" data-lat>KORPA</h2>
          <button className="cart-close" onClick={onClose} type="button" aria-label="Close cart">✕</button>
        </div>
        {cart.items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, fontFamily: "'JetBrains Mono', monospace", color: "rgba(92,58,34,.5)" }}>
            <span data-sr>Корпа је празна.</span>
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
              <span data-sr>НАСТАВИ ДО ПОТВРДЕ →</span>
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
          <h2 className="cart-title" data-sr>ПОДАЦИ ЗА ПРЕУЗИМАЊЕ</h2>
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
