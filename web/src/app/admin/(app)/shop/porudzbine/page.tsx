import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { ShopSubNav } from "../_subnav";
import { PorudzbineClient } from "./porudzbine-client";

export const dynamic = "force-dynamic";

// Supabase types (without codegen) infer the embedded `customers` FK as an array,
// but the runtime returns a single object because customers↔orders is many-to-one.
// Cast at the page boundary until codegen is run.
type OrderRow = {
  id: string;
  total: number;
  status: string;
  pickup_note: string | null;
  items: { id?: string; name?: string; quantity?: number; price?: number }[];
  created_at: string;
  customers: { name: string | null; phone: string; email: string | null } | null;
};

export default async function PorudzbinePage() {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { data } = await sb
    .from("orders")
    .select("id, total, status, pickup_note, items, created_at, customers(name, phone, email)")
    .eq("salon_id", session.salonId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <>
      <ShopSubNav />
      <PorudzbineClient orders={(data ?? []) as unknown as OrderRow[]} />
    </>
  );
}
