// Diagnostic: read prod orders to see schema + sample rows.
// Run from web/: node scripts/inspect-orders.mjs
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

console.log("→ orders table sample (latest 5)…");
const { data, error } = await sb
  .from("orders")
  .select("id, salon_id, customer_id, status, total, items, pickup_note, created_at, customers(name, phone, email)")
  .order("created_at", { ascending: false })
  .limit(5);

if (error) {
  console.error("✗ orders query failed:", error);
  process.exit(1);
}
console.log(`  ${data.length} rows\n`);
for (const o of data) {
  console.log(`  id=${o.id}`);
  console.log(`    salon=${o.salon_id}  status=${o.status}  total=${o.total}`);
  console.log(`    customer_id=${o.customer_id}  customer=${o.customers ? JSON.stringify(o.customers) : "—"}`);
  console.log(`    items=${JSON.stringify(o.items)?.slice(0, 100)}…`);
  console.log(`    pickup_note=${o.pickup_note ?? "—"}`);
  console.log(`    created=${o.created_at}\n`);
}

// Count by status
const { data: byStatus } = await sb.from("orders").select("status");
const counts = {};
for (const r of byStatus ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
console.log("→ status counts:", counts);

// Try a no-op update to confirm write path works.
if (data[0]) {
  const ord = data[0];
  console.log(`\n→ smoke test: rewriting status of ${ord.id} (${ord.status}) to itself…`);
  const { data: updated, error: upErr, status: upStatus } = await sb
    .from("orders")
    .update({ status: ord.status })
    .eq("id", ord.id)
    .select("id, status");
  if (upErr) console.error("  ✗ write failed:", upErr, "http", upStatus);
  else console.log("  ✓ write ok:", updated);
}
