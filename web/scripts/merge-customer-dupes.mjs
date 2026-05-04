// Merge customer rows that share a canonical phone (running this against
// the prod backfill that surfaced one Stasa dupe — 0603300036 vs the old
// +381 form). General enough to handle any future dupes that slip through.
//
// Strategy:
//   - Group active+deleted rows by (salon_id, phone) after canonicalization.
//   - Pick a winner: prefer non-deleted; on tie, oldest created_at.
//   - Re-point bookings.customer_id, orders.customer_id, and
//     loyalty_events.customer_id to the winner.
//   - Hard-delete the loser rows (they're now redundant).
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

const { data: customers } = await sb
  .from("customers")
  .select("id, salon_id, phone, name, email, created_at, deleted_at");

// Group by (salon_id, phone) — phones are already canonical post-migration.
const groups = new Map();
for (const c of customers) {
  if (!c.phone) continue;
  const k = `${c.salon_id}|${c.phone}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(c);
}

const dupes = [...groups.values()].filter((g) => g.length > 1);
console.log(`dupe groups: ${dupes.length}`);

for (const g of dupes) {
  // Winner: prefer alive, then oldest.
  g.sort((a, b) => {
    if (!a.deleted_at && b.deleted_at) return -1;
    if (a.deleted_at && !b.deleted_at) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
  const winner = g[0];
  const losers = g.slice(1);
  console.log(`\nphone=${winner.phone}  winner=${winner.id} (${winner.name})  losers=${losers.length}`);

  for (const l of losers) {
    for (const tbl of ["bookings", "orders", "loyalty_events"]) {
      const { error } = await sb.from(tbl).update({ customer_id: winner.id }).eq("customer_id", l.id);
      if (error) console.error(`  ! ${tbl} repoint failed:`, error.message);
      else console.log(`  ✓ ${tbl} repointed to winner`);
    }
    const { error: delErr } = await sb.from("customers").delete().eq("id", l.id);
    if (delErr) console.error(`  ! customer delete failed:`, delErr.message);
    else console.log(`  ✓ customer ${l.id} hard-deleted`);
  }
}

console.log("\n✅ done");
