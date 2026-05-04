import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const envText = readFileSync(envPath, "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: salon } = await sb.from("salons").select("id, name, email, address, phone").single();
console.log("salon.email =", salon?.email ?? "(NULL)");
console.log("RESEND_FROM_EMAIL =", process.env.RESEND_FROM_EMAIL);

if (!salon?.email) { console.error("✗ salons.email is empty — set it in admin first."); process.exit(1); }

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

const res = await resend.emails.send({
  from: `Berbernica Trisa <${FROM}>`,
  to: salon.email,
  subject: `[TEST] Nov termin · 14:00 · Test Korisnik`,
  html: `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;color:#1A0F05;background:#FAF3E3;padding:24px;"><div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#5C3A22;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px;">TEST · probni mejl iz skripte</div><h1 style="font-family:Georgia,serif;font-style:italic;font-size:22px;margin:0 0 16px 0;">Test Korisnik</h1><table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:16px;"><tr><td style="padding:4px 0;color:#5C3A22;">Telefon</td><td style="text-align:right;"><a href="tel:0601234567" style="color:#D4A53A;text-decoration:none;">0601234567</a></td></tr><tr><td style="padding:4px 0;color:#5C3A22;">Usluga</td><td style="text-align:right;">Šišanje + brijanje</td></tr><tr><td style="padding:4px 0;color:#5C3A22;">Datum</td><td style="text-align:right;">2026-05-06</td></tr><tr><td style="padding:4px 0;color:#5C3A22;">Vreme</td><td style="text-align:right;font-family:Georgia,serif;font-style:italic;color:#D4A53A;font-size:18px;">14:00</td></tr></table><p style="font-size:11px;color:#5C3A22;opacity:.65;margin:0;">Ako vidiš ovo, owner-email pipeline radi.</p></div>`,
});

console.log(JSON.stringify(res, null, 2));
