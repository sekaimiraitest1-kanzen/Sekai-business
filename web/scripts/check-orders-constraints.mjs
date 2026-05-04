// Try every status transition the UI offers to see which (if any) the DB rejects.
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

// Pick any pending order to abuse for the test
const { data: rows } = await sb
  .from("orders")
  .select("id, status")
  .eq("status", "pending")
  .limit(1);
if (!rows?.length) {
  console.log("no pending order to test against");
  process.exit(0);
}
const id = rows[0].id;
const original = rows[0].status;
console.log("test target:", id, "original:", original);

for (const s of ["pending", "ready", "picked_up", "cancelled"]) {
  const { data, error } = await sb.from("orders").update({ status: s }).eq("id", id).select("status");
  console.log(`  → ${s.padEnd(10)} ${error ? "ERR " + error.message : "OK   row=" + JSON.stringify(data)}`);
}

// Restore
await sb.from("orders").update({ status: original }).eq("id", id);
console.log("restored to", original);
