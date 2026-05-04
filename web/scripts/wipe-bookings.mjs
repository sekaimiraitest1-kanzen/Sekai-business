// One-off: wipe every booking + every loyalty event so Triša starts a fresh
// list from tomorrow. All previous data was test/demo. Customers stay
// (already all soft-deleted; new ones will be created on demand by phone).
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
const { count: bookingsBefore } = await sb.from("bookings").select("id", { count: "exact", head: true });
const { count: loyaltyBefore } = await sb.from("loyalty_events").select("id", { count: "exact", head: true });
console.log(`  bookings=${bookingsBefore}  loyalty_events=${loyaltyBefore}`);

console.log("→ deleting loyalty_events…");
const { error: leErr } = await sb.from("loyalty_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (leErr) { console.error("✗ loyalty_events delete failed:", leErr); process.exit(1); }

console.log("→ deleting bookings…");
const { error: bErr } = await sb.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (bErr) { console.error("✗ bookings delete failed:", bErr); process.exit(1); }

const { count: bookingsAfter } = await sb.from("bookings").select("id", { count: "exact", head: true });
const { count: loyaltyAfter } = await sb.from("loyalty_events").select("id", { count: "exact", head: true });
console.log(`✓ done. bookings=${bookingsAfter}  loyalty_events=${loyaltyAfter}`);
