"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number, maxStock?: number) => void;
  setQty: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "vuk_cart_v1";

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore corrupted state */
    }
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [items, hydrated]);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty = 1, maxStock?: number) => {
    setItems((cur) => {
      const existing = cur.find((i) => i.productId === item.productId);
      if (existing) {
        const newQty = existing.quantity + qty;
        const capped = maxStock != null ? Math.min(newQty, maxStock) : newQty;
        return cur.map((i) => (i.productId === item.productId ? { ...i, quantity: capped } : i));
      }
      const startQty = maxStock != null ? Math.min(qty, maxStock) : qty;
      return [...cur, { ...item, quantity: startQty }];
    });
  }, []);

  const setQty = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((cur) => cur.filter((i) => i.productId !== productId));
    } else {
      setItems((cur) => cur.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
    }
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((cur) => cur.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const total = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);

  return <Ctx.Provider value={{ items, count, total, add, setQty, remove, clear }}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
