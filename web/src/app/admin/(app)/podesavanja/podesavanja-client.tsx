"use client";

import { useState, useTransition } from "react";
import { changePin, upsertAnnouncement, deleteAnnouncement } from "./actions";

type Ann = {
  id: string;
  title_sr: string | null;
  title_lat: string | null;
  body_sr: string;
  body_lat: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export function PodesavanjaClient({ announcements, email }: { announcements: Ann[]; email: string }) {
  const [tab, setTab] = useState<"pin" | "banner" | "info">("pin");
  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>ПОДЕШАВАЊА</span><span data-lat>PODEŠAVANJA</span>
          </div>
          <div className="adm-page-subtitle">{email}</div>
        </div>
      </div>

      <div className="adm-toggle" style={{ marginBottom: 16 }}>
        <button className={`adm-toggle-opt ${tab === "pin" ? "active" : ""}`} onClick={() => setTab("pin")} type="button">PIN</button>
        <button className={`adm-toggle-opt ${tab === "banner" ? "active" : ""}`} onClick={() => setTab("banner")} type="button">BANNER</button>
        <button className={`adm-toggle-opt ${tab === "info" ? "active" : ""}`} onClick={() => setTab("info")} type="button">INFO</button>
      </div>

      {tab === "pin" && <PinChange />}
      {tab === "banner" && <Announcements list={announcements} />}
      {tab === "info" && (
        <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>SISTEM</div>
          <div className="adm-row"><span style={{ color: "rgba(245,233,208,.5)" }}>Email</span><span style={{ color: "var(--cream)" }}>{email}</span></div>
          <div className="adm-row"><span style={{ color: "rgba(245,233,208,.5)" }}>Auto-lock</span><span style={{ color: "var(--cream)" }}>24h</span></div>
          <div className="adm-row"><span style={{ color: "rgba(245,233,208,.5)" }}>Max PIN attempts</span><span style={{ color: "var(--cream)" }}>5 → lockout 10min</span></div>
        </div>
      )}
    </>
  );
}

function PinChange() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function go() {
    if (next !== confirm) return setMsg("PIN-ovi se ne poklapaju");
    if (!/^\d{4}$/.test(next)) return setMsg("PIN mora imati 4 cifre");
    start(async () => {
      const res = await changePin(current, next);
      if (res.ok) {
        setMsg("✓ PIN promenjen");
        setCurrent(""); setNext(""); setConfirm("");
      } else {
        setMsg(res.error === "WRONG_CURRENT" ? "Pogrešan trenutni PIN" : "Greška");
      }
    });
  }

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
      <label className="adm-form-label">TRENUTNI PIN</label>
      <input className="adm-input" type="password" inputMode="numeric" maxLength={4} value={current} onChange={(e) => setCurrent(e.target.value)} />
      <label className="adm-form-label">NOVI PIN</label>
      <input className="adm-input" type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value)} />
      <label className="adm-form-label">PONOVI NOVI PIN</label>
      <input className="adm-input" type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {msg && <div style={{ color: msg.startsWith("✓") ? "var(--success)" : "var(--danger)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{msg}</div>}
      <button className="adm-btn" disabled={pending || !current || !next || !confirm} onClick={go}>PROMENI PIN</button>
    </div>
  );
}

function Announcements({ list }: { list: Ann[] }) {
  const [editing, setEditing] = useState<Ann | "new" | null>(null);
  return (
    <>
      <button className="adm-btn adm-btn-block" onClick={() => setEditing("new")} style={{ marginBottom: 16 }}>+ NOVI BANNER</button>
      {list.length === 0 && <div className="adm-empty">Nema banner-a.</div>}
      {list.map((a) => (
        <div key={a.id} className="adm-card" style={{ opacity: a.active ? 1 : 0.5 }} onClick={() => setEditing(a)}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: "var(--cream)" }}>{a.title_lat ?? a.body_lat.slice(0, 40)}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)" }}>{a.active ? "ON" : "OFF"}</div>
          </div>
        </div>
      ))}
      {editing && <AnnouncementEditor ann={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function AnnouncementEditor({ ann, onClose }: { ann: Ann | null; onClose: () => void }) {
  const [titleSr, setTitleSr] = useState(ann?.title_sr ?? "");
  const [titleLat, setTitleLat] = useState(ann?.title_lat ?? "");
  const [bodySr, setBodySr] = useState(ann?.body_sr ?? "");
  const [bodyLat, setBodyLat] = useState(ann?.body_lat ?? "");
  const [active, setActive] = useState(ann?.active ?? true);
  const [pending, start] = useTransition();
  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">{ann ? "IZMENI" : "NOVI"} BANNER</div>
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="adm-form-label">NASLOV (ćir.)</label>
          <input className="adm-input" value={titleSr} onChange={(e) => setTitleSr(e.target.value)} />
          <label className="adm-form-label">NASLOV (lat.)</label>
          <input className="adm-input" value={titleLat} onChange={(e) => setTitleLat(e.target.value)} />
          <label className="adm-form-label">PORUKA (ćir.)</label>
          <textarea className="adm-input" rows={2} value={bodySr} onChange={(e) => setBodySr(e.target.value)} placeholder="Затворено 5—7. маја због реновирања" />
          <label className="adm-form-label">PORUKA (lat.)</label>
          <textarea className="adm-input" rows={2} value={bodyLat} onChange={(e) => setBodyLat(e.target.value)} placeholder="Zatvoreno 5—7. maja zbog renoviranja" />
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--cream)" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> AKTIVAN (vidljiv na sajtu)
          </label>
          <button className="adm-btn adm-btn-block" disabled={pending || !bodyLat} onClick={() => start(async () => {
            await upsertAnnouncement({ id: ann?.id, title_sr: titleSr, title_lat: titleLat, body_sr: bodySr, body_lat: bodyLat, active });
            onClose();
          })}>SAČUVAJ</button>
          {ann && <button className="adm-btn adm-btn-danger adm-btn-block" disabled={pending} onClick={() => { if (confirm("Obrisati?")) start(async () => { await deleteAnnouncement(ann.id); onClose(); }); }}>OBRIŠI</button>}
          <button className="adm-btn adm-btn-secondary adm-btn-block" onClick={onClose}>OTKAŽI</button>
        </div>
      </div>
    </div>
  );
}
