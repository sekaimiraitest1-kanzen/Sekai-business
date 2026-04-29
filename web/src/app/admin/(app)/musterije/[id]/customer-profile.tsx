"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { clearNoShowFlag } from "../../termini/actions";
import { saveCustomerNote } from "./actions";

type Customer = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  no_show_count: number | null;
  no_show_flag: boolean | null;
  utm_source: string | null;
  admin_notes: string | null;
  last_visit_date: string | null;
  created_at: string;
};

type Booking = {
  id: string;
  date: string;
  time_slot: string;
  status: string;
  services: { name_sr: string | null; name_lat: string | null; price: number | null } | null;
};

export function CustomerProfile({ customer, bookings }: { customer: Customer; bookings: Booking[] }) {
  const [notes, setNotes] = useState(customer.admin_notes ?? "");
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const totalSpent = bookings.filter((b) => b.status === "done").reduce((sum, b) => sum + (b.services?.price ?? 0), 0);
  const visits = bookings.filter((b) => b.status === "done").length;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link href="/admin/musterije" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.5)", textDecoration: "none", letterSpacing: ".08em" }}>
          ← <span data-sr>МУШТЕРИЈЕ</span><span data-lat>MUŠTERIJE</span>
        </Link>
      </div>

      {customer.no_show_flag && (
        <div className="adm-banner warn">
          <span data-sr>⚠ Активна no-show ознака. Размотри 30% доплату.</span>
          <span data-lat>⚠ Aktivna no-show oznaka. Razmotri 30% doplatu.</span>
          <button className="adm-btn adm-btn-secondary" style={{ marginTop: 8, padding: "6px 12px", fontSize: 11 }} disabled={pending} onClick={() => start(() => { void clearNoShowFlag(customer.id); })}>
            CLEAR FLAG
          </button>
        </div>
      )}

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, fontStyle: "italic", color: "var(--cream)" }}>
        {customer.name ?? "—"}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "var(--mustard)", marginBottom: 16 }}>
        <a href={`tel:${customer.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{customer.phone}</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div className="adm-card" style={{ display: "block", padding: "12px 14px" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontStyle: "italic", color: "var(--mustard)" }}>{visits}</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: "rgba(245,233,208,.4)", letterSpacing: ".1em", textTransform: "uppercase" }}>poseta</div>
        </div>
        <div className="adm-card" style={{ display: "block", padding: "12px 14px" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: "italic", color: "var(--mustard)" }}>{totalSpent}<span style={{ fontSize: 11, marginLeft: 4 }}>RSD</span></div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: "rgba(245,233,208,.4)", letterSpacing: ".1em", textTransform: "uppercase" }}>ukupno</div>
        </div>
      </div>

      <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
          <span data-sr>ИНТЕРНЕ БЕЛЕШКЕ</span>
          <span data-lat>INTERNE BELEŠKE</span>
        </div>
        <textarea className="adm-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voli kratko sa strane…" />
        <button className="adm-btn" disabled={pending} onClick={() => start(async () => { await saveCustomerNote(customer.id, notes); setSavedAt(Date.now()); })}>
          {savedAt && Date.now() - savedAt < 2000 ? "✓ SAČUVANO" : "SAČUVAJ BELEŠKE"}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
          <span data-sr>ИСТОРИЈА ТЕРМИНА</span>
          <span data-lat>ISTORIJA TERMINA</span>
        </div>

        {bookings.length === 0 && <div className="adm-empty">Bez termina.</div>}

        {bookings.map((b) => (
          <div key={b.id} className="adm-card">
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--mustard)" }}>
                {b.date} · {b.time_slot.slice(0, 5)}
              </div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--cream)", marginTop: 2 }}>
                <span data-sr>{b.services?.name_sr}</span><span data-lat>{b.services?.name_lat}</span>
              </div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.5)", textTransform: "uppercase" }}>
              {b.status}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
