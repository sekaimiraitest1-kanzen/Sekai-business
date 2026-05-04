import { CartProvider } from "@/lib/shop/cart-context";
import { CartFlyProvider } from "@/lib/shop/cart-fly";
import { ShopShell } from "./shop-shell";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <CartFlyProvider>
        <ShopShell>{children}</ShopShell>
      </CartFlyProvider>
    </CartProvider>
  );
}
