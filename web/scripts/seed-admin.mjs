// One-time seed: creates Supabase Auth user + admin_users row with PIN hash + storage buckets.
// Run from web/: node scripts/seed-admin.mjs
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env.local manually
const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const envText = readFileSync(envPath, "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const ADMIN_EMAIL = "sekaimiraitest1@gmail.com";
const ADMIN_PIN = "8696";
const SALON_SLUG = "vuk";

async function main() {
  console.log("→ resolving salon...");
  const { data: salon, error: salonErr } = await sb.from("salons").select("id").eq("slug", SALON_SLUG).single();
  if (salonErr || !salon) throw new Error(`salon '${SALON_SLUG}' not found: ${salonErr?.message}`);
  console.log("  salon_id =", salon.id);

  console.log("→ checking auth user...");
  const { data: existing } = await sb.auth.admin.listUsers();
  let user = existing?.users?.find((u) => u.email === ADMIN_EMAIL);
  if (!user) {
    // Cryptographically random password — never logged. Admin uses PIN; if Auth-level password is ever needed,
    // recover via Supabase magic-link reset.
    const tmpPassword = randomBytes(24).toString("base64url");
    const { data: created, error } = await sb.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: tmpPassword,
      email_confirm: true,
    });
    if (error) throw error;
    user = created.user;
    console.log("  created auth user id =", user.id);
    console.log("  ⚠ Auth password set to random bytes (not printed). Use magic-link reset if direct Auth login needed.");
  } else {
    console.log("  existing auth user id =", user.id);
  }

  console.log("→ hashing PIN...");
  const pinHash = await bcrypt.hash(ADMIN_PIN, 10);

  console.log("→ upserting admin_users row...");
  const { error: upsertErr } = await sb
    .from("admin_users")
    .upsert(
      {
        user_id: user.id,
        salon_id: salon.id,
        email: ADMIN_EMAIL,
        role: "admin",
        pin_hash: pinHash,
        failed_pin_attempts: 0,
      },
      { onConflict: "email" }
    );
  if (upsertErr) throw upsertErr;
  console.log("  ✓ admin_users row ready");

  console.log("→ ensuring storage buckets...");
  for (const bucket of ["gallery", "products", "avatars"]) {
    const isPublic = bucket !== "avatars";
    const { error } = await sb.storage.createBucket(bucket, { public: isPublic, fileSizeLimit: 10 * 1024 * 1024 });
    if (error && !error.message.includes("already exists")) {
      console.warn(`  ! bucket ${bucket}: ${error.message}`);
    } else {
      console.log(`  ✓ bucket ${bucket} (public=${isPublic})`);
    }
  }

  console.log("\n✅ Seed complete.");
  console.log("   Admin email :", ADMIN_EMAIL);
  console.log("   Admin PIN   :", ADMIN_PIN);
  console.log("   Open        : http://localhost:3050/admin/login");
}

main().catch((e) => {
  console.error("✗ seed failed:", e);
  process.exit(1);
});
