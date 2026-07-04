"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/**
 * Add-to-cart motion system. Sits next to <CartProvider> so the cart-state
 * concern stays clean and this module owns only the visual feedback:
 *   1. flying ghost from source element → cart icon
 *   2. cart-icon arrival pulse (CSS class toggle, 500ms)
 *   3. editorial top-center toast confirming the action
 *
 * No external animation dependency — Web Animations API + CSS only.
 * Respects `prefers-reduced-motion` (skips ghost + arc, keeps toast as opacity-only).
 */

type FlyOpts = {
  /** Element whose bounding rect is the start of the trajectory. */
  sourceEl: HTMLElement;
  /** Product thumbnail to render inside the ghost. Falls back to initial. */
  imageUrl?: string | null;
  /** Shown in the toast. Latin spelling — toast renders as-is. */
  productName: string;
  /** Quantity added in this single action (not the running cart total). */
  qty?: number;
  /** Single-letter fallback when imageUrl is missing. */
  fallbackInitial?: string;
  /** Total RSD added (qty × price). Used in the toast. */
  priceTotal?: number;
};

type CartFlyCtx = {
  flyToCart: (opts: FlyOpts) => void;
  registerCartTarget: (el: HTMLElement | null) => void;
  /** Bound by ShopShell so the toast's CTA opens the drawer. */
  setOpenCartHandler: (fn: () => void) => void;
};

const Ctx = createContext<CartFlyCtx | null>(null);

type ToastState = {
  id: number;
  productName: string;
  qty: number;
  priceTotal?: number;
};

const TOAST_DURATION_MS = 2200;
const FLY_DURATION_MS = 540;
const PULSE_DELAY_MS = 440;

export function CartFlyProvider({ children }: { children: React.ReactNode }) {
  const cartTargetRef = useRef<HTMLElement | null>(null);
  const openCartRef = useRef<(() => void) | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const registerCartTarget = useCallback((el: HTMLElement | null) => {
    cartTargetRef.current = el;
  }, []);

  const setOpenCartHandler = useCallback((fn: () => void) => {
    openCartRef.current = fn;
  }, []);

  const showToast = useCallback((opts: Pick<FlyOpts, "productName" | "qty" | "priceTotal">) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({
      id: Date.now(),
      productName: opts.productName,
      qty: opts.qty ?? 1,
      priceTotal: opts.priceTotal,
    });
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  const triggerCartPulse = useCallback(() => {
    const el = cartTargetRef.current;
    if (!el) return;
    el.classList.remove("cart-fly-arrived");
    // Force reflow so the class re-add restarts the animation
    void el.offsetWidth;
    el.classList.add("cart-fly-arrived");
    window.setTimeout(() => el.classList.remove("cart-fly-arrived"), 600);
  }, []);

  const flyToCart = useCallback(
    (opts: FlyOpts) => {
      const target = cartTargetRef.current;
      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Always show toast — the verbal confirmation matters even when
      // motion is suppressed.
      showToast(opts);

      if (!target || reducedMotion) {
        // Fallback: just pulse the cart icon (CSS handles reduced-motion via media query).
        triggerCartPulse();
        return;
      }

      const src = opts.sourceEl.getBoundingClientRect();
      const dst = target.getBoundingClientRect();

      // Ghost is 64px square unless source is much smaller (then track source size).
      const size = Math.min(72, Math.max(48, Math.round(Math.min(src.width, src.height) * 0.85)));
      const startX = src.left + src.width / 2 - size / 2;
      const startY = src.top + src.height / 2 - size / 2;
      const endX = dst.left + dst.width / 2 - size / 2;
      const endY = dst.top + dst.height / 2 - size / 2;

      const ghost = document.createElement("div");
      ghost.className = "cart-fly-ghost";
      ghost.style.width = `${size}px`;
      ghost.style.height = `${size}px`;

      if (opts.imageUrl) {
        const img = document.createElement("img");
        img.src = opts.imageUrl;
        img.alt = "";
        img.draggable = false;
        ghost.appendChild(img);
      } else {
        const letter = document.createElement("span");
        letter.className = "cart-fly-ghost-letter";
        letter.textContent = (opts.fallbackInitial ?? opts.productName.charAt(0) ?? "·").toUpperCase();
        ghost.appendChild(letter);
      }

      // Mustard ring pulse element (separate so it can outlive the ghost briefly).
      const ring = document.createElement("div");
      ring.className = "cart-fly-source-ring";
      ring.style.left = `${src.left + src.width / 2}px`;
      ring.style.top = `${src.top + src.height / 2}px`;

      document.body.appendChild(ring);
      document.body.appendChild(ghost);

      // Mid-flight peak: lift the trajectory by ~22% of the diagonal so the
      // arc reads as physical weight, not a straight diagonal slide.
      const dx = endX - startX;
      const dy = endY - startY;
      const lift = Math.max(60, Math.min(160, Math.hypot(dx, dy) * 0.22));
      const midX = startX + dx * 0.55;
      const midY = startY + dy * 0.35 - lift;

      ghost.animate(
        [
          {
            transform: `translate(${startX}px, ${startY}px) scale(1) rotate(0deg)`,
            opacity: 1,
            offset: 0,
          },
          {
            transform: `translate(${midX}px, ${midY}px) scale(0.72) rotate(8deg)`,
            opacity: 0.95,
            offset: 0.55,
          },
          {
            transform: `translate(${endX}px, ${endY}px) scale(0.38) rotate(14deg)`,
            opacity: 0,
            offset: 1,
          },
        ],
        {
          duration: FLY_DURATION_MS,
          easing: "cubic-bezier(0.55, 0.05, 0.36, 1)",
          fill: "forwards",
        },
      ).onfinish = () => ghost.remove();

      ring.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0.85 },
          { transform: "translate(-50%, -50%) scale(2.2)", opacity: 0 },
        ],
        { duration: 520, easing: "cubic-bezier(0.25, 0.6, 0.3, 1)", fill: "forwards" },
      ).onfinish = () => ring.remove();

      window.setTimeout(triggerCartPulse, PULSE_DELAY_MS);
    },
    [showToast, triggerCartPulse],
  );

  const value = useMemo<CartFlyCtx>(
    () => ({ flyToCart, registerCartTarget, setOpenCartHandler }),
    [flyToCart, registerCartTarget, setOpenCartHandler],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {mounted && toast
        ? createPortal(
            <CartToast
              key={toast.id}
              toast={toast}
              onOpenCart={() => {
                setToast(null);
                openCartRef.current?.();
              }}
              onDismiss={() => setToast(null)}
            />,
            document.body,
          )
        : null}
    </Ctx.Provider>
  );
}

export function useCartFly(): CartFlyCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCartFly must be used inside <CartFlyProvider>");
  return ctx;
}

function CartToast({
  toast,
  onOpenCart,
  onDismiss,
}: {
  toast: ToastState;
  onOpenCart: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="cart-fly-toast-wrap" role="status" aria-live="polite">
      <div className="cart-fly-toast">
        <button
          type="button"
          className="cart-fly-toast-main"
          onClick={onOpenCart}
          aria-label="Open cart"
        >
          <span className="cart-fly-toast-check" aria-hidden="true">✓</span>
          <span className="cart-fly-toast-body">
            <span className="cart-fly-toast-name">{toast.productName}</span>
            <span className="cart-fly-toast-meta">
              <span data-sr>in cart</span>
              <span data-lat>u korpi</span>
              {toast.qty > 1 ? <> · <strong>{toast.qty}×</strong></> : null}
              {typeof toast.priceTotal === "number" ? <> · {toast.priceTotal} RSD</> : null}
            </span>
          </span>
          <span className="cart-fly-toast-cta" aria-hidden="true">
            <span data-sr>OPEN →</span>
            <span data-lat>OTVORI →</span>
          </span>
        </button>
        <button
          type="button"
          className="cart-fly-toast-x"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
