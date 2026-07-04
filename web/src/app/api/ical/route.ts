/**
 * G6 — iCal feed for the salon's Google/Apple/whatever calendar.
 *
 * Auth: short opaque token in `?t=...` (separate from the admin JWT cookie
 * because phone calendar apps follow URLs without cookies). The token is
 * derived from the SUPABASE_SERVICE_ROLE_KEY but with a deterministic
 * salt + slice — same for every request, never expires, can be rotated by
 * changing the salon-secret env var. Anyone with the URL can read the feed
 * but can't do anything else; treat the URL like a password.
 *
 * Output: RFC 5545 .ics text covering the next 60 days. Triša pastes the
 * URL into Google Calendar → "From URL" and her phone's calendar app
 * polls it automatically every few hours.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayKey } from "@/lib/datetime";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const ICAL_SALT = "trisa-ical-feed-v1";

function expectedToken(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return crypto.createHash("sha256").update(secret + ICAL_SALT).digest("hex").slice(0, 32);
}

function escapeIcal(s: string): string {
  return s.replace(/[\\;,]/g, "\\$&").replace(/\r?\n/g, "\\n");
}

function fmtIcalDate(date: string, time: string): string {
  // 2026-04-29 + 10:30:00 → 20260429T103000
  const d = date.replace(/-/g, "");
  const t = time.slice(0, 8).replace(/:/g, "");
  return `${d}T${t}`;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token || token !== expectedToken()) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sb = createAdminClient();
  // Surface up to 60 days of confirmed/done bookings. Cancelled / no-show are
  // skipped (no value showing them on Triša's calendar).
  const today = todayKey();
  const { data: bookings } = await sb
    .from("bookings")
    .select("id, date, time_slot, status, customers(name, phone), services(name_lat, duration_min)")
    .gte("date", today)
    .in("status", ["confirmed", "pending", "done"])
    .order("date", { ascending: true });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barbershop Vuk//iCal Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Barbershop Vuk · Termini",
    "X-WR-TIMEZONE:Europe/Belgrade",
  ];

  for (const b of bookings ?? []) {
    const customer = Array.isArray(b.customers) ? b.customers[0] : b.customers;
    const service = Array.isArray(b.services) ? b.services[0] : b.services;
    const duration = service?.duration_min ?? 30;

    const startD = b.date as string;
    const startT = `${(b.time_slot as string).slice(0, 5)}:00`;
    const dtStart = fmtIcalDate(startD, startT);

    // End = start + duration.
    const [h, m] = startT.split(":").map(Number);
    const endTotalMin = h * 60 + m + duration;
    const endH = Math.floor(endTotalMin / 60);
    const endM = endTotalMin % 60;
    const endT = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`;
    const dtEnd = fmtIcalDate(startD, endT);

    const summary = [
      customer?.name ?? "—",
      "·",
      service?.name_lat ?? "termin",
    ].join(" ");

    const description = [
      customer?.phone ? `Tel: ${customer.phone}` : "",
      service?.name_lat ? `Usluga: ${service.name_lat}` : "",
      `Status: ${b.status}`,
    ].filter(Boolean).join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@barbershop-vuk.rs`,
      `DTSTAMP:${dtStart}`,
      `DTSTART;TZID=Europe/Belgrade:${dtStart}`,
      `DTEND;TZID=Europe/Belgrade:${dtEnd}`,
      `SUMMARY:${escapeIcal(summary)}`,
      `DESCRIPTION:${escapeIcal(description)}`,
      `STATUS:${b.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="trisa.ics"',
      // Calendar apps respect Cache-Control reasonably; refresh ~hourly.
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
