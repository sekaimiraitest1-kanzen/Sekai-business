"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelBookingByToken } from "./actions";

export function CancelForm({
  bookingId,
  token,
  customerName,
  serviceName,
  date,
  timeSlot,
  price,
}: {
  bookingId: string;
  token: string;
  customerName: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  price: number;
}) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ wasLate: boolean; hoursUntil: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await cancelBookingByToken(bookingId, token, reason || undefined);
      if (!res.ok) {
        const map: Record<string, string> = {
          INVALID_TOKEN: "Link nije ispravan.",
          NOT_FOUND: "Termin ne postoji.",
          ALREADY_INACTIVE: "Termin je već otkazan ili obavljen.",
          ALREADY_PAST: "Termin je prošao, ne može se otkazati.",
          DB_FAILED: "Greška pri snimanju.",
        };
        setErr(map[res.error] ?? "Greška.");
        return;
      }
      setDone({ wasLate: res.wasLate, hoursUntil: res.hoursUntil });
    });
  }

  if (done) {
    return (
      <div style={{ background: "rgba(245,233,208,.05)", padding: 32, borderRadius: 4, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{done.wasLate ? "⚠" : "✓"}</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22, marginBottom: 12, color: "var(--cream)" }}>
          <span data-sr>Термин је отказан</span>
          <span data-lat>Termin je otkazan</span>
        </h1>
        {done.wasLate ? (
          <div style={{ background: "rgba(204,34,34,.12)", padding: 16, marginBottom: 16, borderRadius: 4, color: "#ffb0b0", fontSize: 13, lineHeight: 1.6 }}>
            <strong>
              <span data-sr>Отказано је мање од 2 сата пре термина.</span>
              <span data-lat>Otkazano je manje od 2 sata pre termina.</span>
            </strong>
            <br />
            <span data-sr>Према Условима коришћења, твој следећи термин има <strong>+30% доплате</strong> без обзира коју услугу одабереш. Доплата ће се видети при наредном заказивању.</span>
            <span data-lat>Prema Uslovima korišćenja, tvoj sledeći termin ima <strong>+30% doplate</strong> bez obzira koju uslugu odabereš. Doplata će se videti pri narednom zakazivanju.</span>
          </div>
        ) : (
          <p style={{ color: "rgba(245,233,208,.75)", lineHeight: 1.6, fontSize: 14, marginBottom: 16 }}>
            <span data-sr>Видимо се неки други пут.</span>
            <span data-lat>Vidimo se neki drugi put.</span>
          </p>
        )}
        <Link href="/zakazivanje" style={{ display: "inline-block", marginTop: 12, padding: "10px 24px", background: "var(--mustard)", color: "var(--brown-950)", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
          <span data-sr>НОВИ ТЕРМИН</span>
          <span data-lat>NOVI TERMIN</span>
        </Link>
        <Link href="/" style={{ display: "inline-block", marginLeft: 8, padding: "10px 24px", background: "transparent", border: "1px solid rgba(245,233,208,.3)", color: "var(--cream)", textDecoration: "none", fontSize: 13 }}>
          <span data-sr>ПОЧЕТНА</span>
          <span data-lat>POČETNA</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: "rgba(245,233,208,.05)", padding: 24, borderRadius: 4 }}>
      <div style={{ marginBottom: 16, lineHeight: 1.6 }}>
        <span data-sr>{customerName ? `Здраво, ${customerName}.` : "Здраво."}</span>
        <span data-lat>{customerName ? `Zdravo, ${customerName}.` : "Zdravo."}</span>
        <br />
        <span data-sr>Желиш да откажеш овај термин?</span>
        <span data-lat>Želiš da otkažeš ovaj termin?</span>
      </div>

      <table style={{ width: "100%", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, background: "rgba(245,233,208,.05)", padding: 12, marginBottom: 16 }}>
        <tbody>
          <tr><td style={{ color: "rgba(245,233,208,.5)", padding: 4 }}>USLUGA</td><td style={{ textAlign: "right", padding: 4 }}>{serviceName}</td></tr>
          <tr><td style={{ color: "rgba(245,233,208,.5)", padding: 4 }}>DATUM</td><td style={{ textAlign: "right", padding: 4 }}>{date}</td></tr>
          <tr><td style={{ color: "rgba(245,233,208,.5)", padding: 4 }}>VREME</td><td style={{ textAlign: "right", padding: 4 }}>{timeSlot}</td></tr>
          <tr><td style={{ color: "rgba(245,233,208,.5)", padding: 4 }}>CENA</td><td style={{ textAlign: "right", padding: 4, color: "var(--mustard)" }}>{price} RSD</td></tr>
        </tbody>
      </table>

      <div style={{ background: "rgba(212,165,58,.08)", padding: 12, marginBottom: 16, fontSize: 12, color: "rgba(245,233,208,.75)", lineHeight: 1.6 }}>
        ⚠ <span data-sr>Отказивање је слободно до <strong>2 сата</strong> пре термина. Касније отказивање значи да следећи термин има +30% доплате.</span>
        <span data-lat>Otkazivanje je slobodno do <strong>2 sata</strong> pre termina. Kasnije otkazivanje znači da sledeći termin ima +30% doplate.</span>
      </div>

      <label style={{ display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.5)", marginBottom: 6 }}>
        <span data-sr>РАЗЛОГ (опционо)</span>
        <span data-lat>RAZLOG (opciono)</span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={200}
        rows={3}
        placeholder="npr. Iskrslo nešto"
        style={{ width: "100%", padding: 10, background: "rgba(245,233,208,.05)", border: "1px solid rgba(245,233,208,.15)", color: "var(--cream)", fontSize: 13, marginBottom: 12, fontFamily: "Inter, sans-serif", resize: "vertical" }}
        disabled={pending}
      />

      {err && (
        <div style={{ color: "#ffb0b0", fontSize: 13, marginBottom: 12 }}>{err}</div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/" style={{ flex: 1, padding: "12px 16px", background: "transparent", border: "1px solid rgba(245,233,208,.25)", color: "var(--cream)", textDecoration: "none", fontSize: 13, textAlign: "center" }}>
          <span data-sr>НАЗАД</span>
          <span data-lat>NAZAD</span>
        </Link>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          style={{ flex: 1, padding: "12px 16px", background: "rgba(204,34,34,.85)", color: "#FAF3E3", border: 0, fontWeight: 600, fontSize: 13, cursor: pending ? "default" : "pointer" }}
        >
          <span data-sr>{pending ? "..." : "ПОТВРДИ ОТКАЗИВАЊЕ"}</span>
          <span data-lat>{pending ? "..." : "POTVRDI OTKAZIVANJE"}</span>
        </button>
      </div>
    </div>
  );
}
