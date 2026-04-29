import { CartProvider } from "@/lib/shop/cart-context";
import { ShopShell } from "./shop-shell";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <ShopShell>{children}</ShopShell>
    </CartProvider>
  );
}
