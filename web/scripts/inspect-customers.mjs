// Look for duplicate customer rows in prod, grouped by phone, also after
// a normalized comparison (digits-only, last-9-digits) so we catch dupes
// hidden by formatting differences.
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

function normalize(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  // Strip leading country code 381 (Serbia) so 381605997257 ≡ 0605997257
  const noCc = digits.startsWith("381") ? "0" + digits.slice(3) : digits;
  // Drop a leading 0 to get 9-digit national-format trunk for comparison.
  return noCc.startsWith("0") ? noCc.slice(1) : noCc;
}

const { data: customers } = await sb
  .from("customers")
  .select("id, salon_id, phone, name, email, created_at, deleted_at");

console.log(`total customer rows: ${customers.length}`);
console.log(`  active: ${customers.filter((c) => !c.deleted_at).length}`);
console.log(`  soft-deleted: ${customers.filter((c) => c.deleted_at).length}\n`);

// Exact-match dupes — include soft-deleted so we can see history too.
const byExact = new Map();
for (const c of customers) {
  const k = `${c.salon_id}|${c.phone}`;
  if (!byExact.has(k)) byExact.set(k, []);
  byExact.get(k).push(c);
}
const exactDupes = [...byExact.values()].filter((g) => g.length > 1);
console.log(`exact-phone dupe groups: ${exactDupes.length}`);
for (const g of exactDupes) {
  console.log(`  phone="${g[0].phone}":`);
  for (const c of g) console.log(`    - id=${c.id}  name=${c.name}  created=${c.created_at}`);
}

// Normalized dupes — include soft-deleted.
const byNorm = new Map();
for (const c of customers) {
  const k = `${c.salon_id}|${normalize(c.phone)}`;
  if (!byNorm.has(k)) byNorm.set(k, []);
  byNorm.get(k).push(c);
}
const normDupes = [...byNorm.values()].filter((g) => g.length > 1);
console.log(`\nnormalized-phone dupe groups: ${normDupes.length}`);
for (const g of normDupes) {
  console.log(`  norm="${normalize(g[0].phone)}":`);
  for (const c of g) console.log(`    - id=${c.id}  raw="${c.phone}"  name=${c.name}  created=${c.created_at}`);
}

// Show raw distribution of formats so we know what we're up against.
const sample = customers.slice(0, 30).map((c) => `${c.phone} → ${normalize(c.phone)}`);
console.log(`\nphone format sample (30):`);
sample.forEach((s) => console.log("  " + s));
