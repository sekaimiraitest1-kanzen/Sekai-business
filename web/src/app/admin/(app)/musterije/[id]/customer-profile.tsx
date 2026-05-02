"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { clearNoShowFlag } from "../../termini/actions";
import { saveCustomerNote, redeemLoyalty, deleteCustomer } from "./actions";

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

export function CustomerProfile({ customer, bookings, loyaltyProgress, loyaltyTarget, canDelete }: {
  customer: Customer;
  bookings: Booking[];
  loyaltyProgress: number;
  loyaltyTarget: number;
  canDelete: boolean;
}) {
  const [notes, setNotes] = useState(customer.admin_notes ?? "");
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalSpent = bookings.filter((b) => b.status === "done").reduce((sum, b) => sum + (b.services?.price ?? 0), 0);
  const visits = bookings.filter((b) => b.status === "done").length;
  const canRedeem = loyaltyProgress >= loyaltyTarget;

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
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: "rgba(245,233,208,.4)", letterSpacing: ".1em", textTransform: "uppercase" }}>
            <span data-sr>посета</span>
            <span data-lat>poseta</span>
          </div>
        </div>
        <div className="adm-card" style={{ display: "block", padding: "12px 14px" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: "italic", color: "var(--mustard)" }}>{totalSpent}<span style={{ fontSize: 11, marginLeft: 4 }}>RSD</span></div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: "rgba(245,233,208,.4)", letterSpacing: ".1em", textTransform: "uppercase" }}>
            <span data-sr>укупно</span>
            <span data-lat>ukupno</span>
          </div>
        </div>
      </div>

      {/* G1 — Loyalty card. Hidden when target=0 (e.g. disabled). */}
      {loyaltyTarget > 0 && (
        <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 8, marginBottom: 16, borderColor: canRedeem ? "var(--mustard)" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              🎁 LOYALTY
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--cream)" }}>
              {Math.min(loyaltyProgress, loyaltyTarget)} / {loyaltyTarget}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, background: "rgba(245, 233, 208, 0.1)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, (loyaltyProgress / loyaltyTarget) * 100)}%`,
              height: "100%",
              background: canRedeem ? "var(--mustard)" : "rgba(212, 165, 58, 0.5)",
              transition: "width .3s ease",
            }} />
          </div>
          {canRedeem ? (
            <>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontStyle: "italic", color: "var(--mustard)" }}>
                <span data-sr>✓ Стекао је бесплатно шишање.</span>
                <span data-lat>✓ Stekao je besplatno šišanje.</span>
              </div>
              <button
                className="adm-btn"
                disabled={pending}
                onClick={() => start(async () => {
                  if (confirm("Iskoristi nagradu? (uklanja status sa profila)")) {
                    await redeemLoyalty(customer.id, loyaltyTarget);
                  }
                })}
              >
                <span data-sr>ИСКОРИСТИ НАГРАДУ</span>
                <span data-lat>ISKORISTI NAGRADU</span>
              </button>
            </>
          ) : (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(245, 233, 208, 0.6)" }}>
              <span data-sr>Још {loyaltyTarget - loyaltyProgress} {loyaltyTarget - loyaltyProgress === 1 ? "посета" : "посета"} до бесплатног шишања.</span>
              <span data-lat>Još {loyaltyTarget - loyaltyProgress} {loyaltyTarget - loyaltyProgress === 1 ? "poseta" : "poseta"} do besplatnog šišanja.</span>
            </div>
          )}
        </div>
      )}

      <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
          <span data-sr>ИНТЕРНЕ БЕЛЕШКЕ</span>
          <span data-lat>INTERNE BELEŠKE</span>
        </div>
        <textarea className="adm-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voli kratko sa strane…" />
        <button className="adm-btn" disabled={pending} onClick={() => start(async () => { await saveCustomerNote(customer.id, notes); setSavedAt(Date.now()); })}>
          {savedAt && Date.now() - savedAt < 2000 ? "✓ SAČUVANO" : (
            <>
              <span data-sr>САЧУВАЈ БЕЛЕШКЕ</span>
              <span data-lat>SAČUVAJ BELEŠKE</span>
            </>
          )}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
          <span data-sr>ИСТОРИЈА ТЕРМИНА</span>
          <span data-lat>ISTORIJA TERMINA</span>
        </div>

        {bookings.length === 0 && (
          <div className="adm-empty">
            <span data-sr>Без термина.</span>
            <span data-lat>Bez termina.</span>
          </div>
        )}

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
              <span data-sr>{statusLabel(b.status, "sr")}</span>
              <span data-lat>{statusLabel(b.status, "lat")}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Owner-only danger zone — soft-deletes the customer.
          Two-step confirm to avoid accidental clicks: the destructive button
          shows a "are you sure?" prompt first; only the second click actually
          fires the action. */}
      {canDelete && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,80,80,.15)" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: "rgba(255,140,140,.7)", letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 8 }}>
            <span data-sr>ОПАСНА ЗОНА</span><span data-lat>OPASNA ZONA</span>
          </div>
          {!confirmDelete ? (
            <button
              type="button"
              className="adm-btn"
              style={{ background: "rgba(255,80,80,.12)", color: "#ffb0b0", border: "1px solid rgba(255,80,80,.3)" }}
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
            >
              🗑 <span data-sr>ОБРИШИ МУШТЕРИЈУ</span><span data-lat>OBRIŠI MUŠTERIJU</span>
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, color: "rgba(245,233,208,.75)", lineHeight: 1.5 }}>
                <span data-sr>Сигуран? Муштерија нестаје са листе. Прошли термини остају у статистици.</span>
                <span data-lat>Siguran? Mušterija nestaje sa liste. Prošli termini ostaju u statistici.</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="adm-btn-secondary"
                  onClick={() => setConfirmDelete(false)}
                  disabled={pending}
                  style={{ flex: 1 }}
                >
                  <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
                </button>
                <button
                  type="button"
                  className="adm-btn"
                  style={{ background: "rgba(255,80,80,.85)", color: "#1A0F05", flex: 1 }}
                  disabled={pending}
                  onClick={() => start(async () => { await deleteCustomer(customer.id); })}
                >
                  🗑 <span data-sr>ПОТВРДИ БРИСАЊЕ</span><span data-lat>POTVRDI BRISANJE</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function statusLabel(status: string, lang: "sr" | "lat"): string {
  const map: Record<string, { sr: string; lat: string }> = {
    confirmed: { sr: "ПОТВРЂЕНО", lat: "POTVRĐENO" },
    pending: { sr: "ЧЕКА", lat: "ČEKA" },
    done: { sr: "ОБАВЉЕНО", lat: "OBAVLJENO" },
    no_show: { sr: "NO-SHOW", lat: "NO-SHOW" },
    cancelled: { sr: "ОТКАЗАНО", lat: "OTKAZANO" },
  };
  return map[status]?.[lang] ?? status.toUpperCase();
}
