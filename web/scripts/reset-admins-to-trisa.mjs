// One-off prod cleanup (2026-05-04):
//  - hard-delete every admin_users row except Triša (the owner)
//  - reset Triša's PIN to 4345 + ensure she's active & role=admin
//  - reset salon-level PIN rate-limiter so a clean login works immediately
//
// Side effect: bookings.staff_id is `ON DELETE SET NULL`, so past bookings
// attributed to deleted staff become un-attributed (records preserved, stats
// lose their staff name). This was discussed with the owner before running.
//
// Run from web/: node scripts/reset-admins-to-trisa.mjs
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
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

const KEEP_EMAIL = "berbernicatrisa@gmail.com";
const NEW_PIN = "4345";

console.log("→ locating owner row...");
const { data: owner, error: ownerErr } = await sb
  .from("admin_users")
  .select("id, salon_id, email, role")
  .eq("email", KEEP_EMAIL)
  .maybeSingle();

if (ownerErr || !owner) {
  console.error("✗ owner not found by email:", KEEP_EMAIL, ownerErr);
  process.exit(1);
}
console.log("  owner.id =", owner.id, "salon =", owner.salon_id);

console.log("→ counting bookings about to lose staff attribution...");
const { count: orphanedCount } = await sb
  .from("bookings")
  .select("id", { count: "exact", head: true })
  .neq("staff_id", owner.id)
  .not("staff_id", "is", null);
console.log(`  ${orphanedCount ?? 0} bookings will have staff_id → NULL`);

console.log("→ hard-deleting every other admin_users row...");
const { data: deleted, error: delErr } = await sb
  .from("admin_users")
  .delete()
  .neq("id", owner.id)
  .select("id, email, display_name");
if (delErr) {
  console.error("✗ delete failed:", delErr);
  process.exit(1);
}
console.log(`  removed ${deleted?.length ?? 0} rows:`);
for (const r of deleted ?? []) console.log(`    - ${r.email} (${r.display_name ?? "—"}) [${r.id}]`);

console.log(`→ resetting Triša's PIN to ${NEW_PIN}...`);
const pinHash = await bcrypt.hash(NEW_PIN, 10);
const { error: updErr } = await sb
  .from("admin_users")
  .update({
    pin_hash: pinHash,
    role: "admin",
    is_active: true,
    deleted_at: null,
    failed_pin_attempts: 0,
  })
  .eq("id", owner.id);
if (updErr) {
  console.error("✗ owner update failed:", updErr);
  process.exit(1);
}
console.log("  ✓ owner row updated");

console.log("→ clearing salon-level PIN lockout...");
const { error: salonErr } = await sb
  .from("salons")
  .update({ pin_failed_attempts: 0, pin_locked_until: null })
  .eq("id", owner.salon_id);
if (salonErr) {
  console.error("✗ salon reset failed:", salonErr);
  process.exit(1);
}
console.log("  ✓ salon counter cleared");

console.log("\n✅ Done. Only owner remains. Login with PIN 4345.");
