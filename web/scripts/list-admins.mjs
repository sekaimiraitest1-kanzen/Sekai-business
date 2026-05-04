// One-off: list all admin_users + matching auth users so we can decide who stays.
// Run from web/: node scripts/list-admins.mjs
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

const { data: admins, error } = await sb
  .from("admin_users")
  .select("id, user_id, salon_id, email, role, display_name, first_name, last_name, phone, is_active, deleted_at, created_at")
  .order("created_at", { ascending: true });

if (error) {
  console.error("admin_users query failed:", error);
  process.exit(1);
}

console.log(`admin_users rows: ${admins.length}\n`);
for (const a of admins) {
  console.log(`  id=${a.id}`);
  console.log(`    email=${a.email}`);
  console.log(`    role=${a.role}  active=${a.is_active}  deleted_at=${a.deleted_at}`);
  console.log(`    display_name=${a.display_name}  first=${a.first_name}  last=${a.last_name}`);
  console.log(`    phone=${a.phone}`);
  console.log(`    user_id=${a.user_id}`);
  console.log(`    created=${a.created_at}\n`);
}

const { data: auth } = await sb.auth.admin.listUsers();
console.log(`auth.users rows: ${auth?.users?.length ?? 0}`);
for (const u of auth?.users ?? []) {
  console.log(`  id=${u.id}  email=${u.email}  created=${u.created_at}`);
}
