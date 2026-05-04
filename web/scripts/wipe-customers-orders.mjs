// Final reset: wipe every customer + every order so Triša's stats start
// at literal zero. Earlier wipe handled bookings + loyalty_events;
// customers (all soft-deleted) were still leaking into "novih mušterija"
// because the stats query doesn't filter deleted_at.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const envText = readFileSync(envPath, "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log("→ counting before…");
const { count: ordersBefore } = await sb.from("orders").select("id", { count: "exact", head: true });
const { count: custBefore } = await sb.from("customers").select("id", { count: "exact", head: true });
const { count: bookingsBefore } = await sb.from("bookings").select("id", { count: "exact", head: true });
const { count: loyaltyBefore } = await sb.from("loyalty_events").select("id", { count: "exact", head: true });
console.log(`  orders=${ordersBefore}  customers=${custBefore}  bookings=${bookingsBefore}  loyalty_events=${loyaltyBefore}`);

console.log("→ deleting orders…");
const { error: oErr } = await sb.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (oErr) { console.error("✗ orders delete failed:", oErr); process.exit(1); }

console.log("→ deleting customers…");
const { error: cErr } = await sb.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (cErr) { console.error("✗ customers delete failed:", cErr); process.exit(1); }

const { count: ordersAfter } = await sb.from("orders").select("id", { count: "exact", head: true });
const { count: custAfter } = await sb.from("customers").select("id", { count: "exact", head: true });
console.log(`✓ done. orders=${ordersAfter}  customers=${custAfter}`);
