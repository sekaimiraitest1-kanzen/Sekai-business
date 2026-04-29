"use client";

import { useState, useTransition } from "react";
import { createBlock, deleteBlock } from "./actions";

type Block = {
  id: string;
  date: string;
  time_slot: string | null;
  reason: string | null;
  created_at: string;
};

export function BlokiranoClient({ blocks }: { blocks: Block[] }) {
  const [showForm, setShowForm] = useState(false);
  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>БЛОКИРАНО</span>
            <span data-lat>BLOKIRANO</span>
          </div>
          <div className="adm-page-subtitle">
            <span data-sr>Дани и термини када је затворено (одмор, обуке…)</span>
            <span data-lat>Dani i termini kada je zatvoreno (odmor, obuke…)</span>
          </div>
        </div>
        <button className="adm-fab-btn" type="button" onClick={() => setShowForm(true)}>+</button>
      </div>

      {blocks.length === 0 && (
        <div className="adm-empty">
          <span data-sr>Нема блокова. Додај први.</span>
          <span data-lat>Nema blokova. Dodaj prvi.</span>
        </div>
      )}

      {blocks.map((b) => (
        <BlockRow key={b.id} block={b} />
      ))}

      {showForm && <BlockForm onClose={() => setShowForm(false)} />}
    </>
  );
}

function BlockRow({ block }: { block: Block }) {
  const [pending, start] = useTransition();
  const isWholeDay = !block.time_slot;
  return (
    <div className="adm-card">
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: "var(--cream)", letterSpacing: ".06em" }}>
          {formatDate(block.date)}
          {!isWholeDay && (
            <span style={{ color: "var(--mustard)", marginLeft: 8 }}>· {block.time_slot?.slice(0, 5)}</span>
          )}
        </div>
        {isWholeDay && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--mustard)", letterSpacing: ".08em", marginTop: 2 }}>
            <span data-sr>ЦЕО ДАН</span>
            <span data-lat>CEO DAN</span>
          </div>
        )}
        {block.reason && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(245,233,208,.6)", marginTop: 4 }}>
            {block.reason}
          </div>
        )}
      </div>
      <button
        type="button"
        className="adm-app-bar-btn"
        disabled={pending}
        onClick={() => {
          if (confirm("Obrisati blok?")) start(() => { void deleteBlock(block.id); });
        }}
        style={{ width: 32, height: 32, color: "var(--danger)" }}
        aria-label="delete"
      >
        ✕
      </button>
    </div>
  );
}

function BlockForm({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState("");
  const [wholeDay, setWholeDay] = useState(true);
  const [timeSlot, setTimeSlot] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    if (!date) {
      setErr("Datum je obavezan");
      return;
    }
    setErr(null);
    start(async () => {
      const res = await createBlock({
        date,
        timeSlot: wholeDay ? undefined : timeSlot,
        reason: reason || undefined,
      });
      if (res.ok) onClose();
      else setErr(res.error);
    });
  }

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet">
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">
          <span data-sr>НОВИ БЛОК</span>
          <span data-lat>NOVI BLOK</span>
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="adm-form-label" data-sr>ДАТУМ</label>
          <label className="adm-form-label" data-lat>DATUM</label>
          <input className="adm-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--cream)", fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>
            <input type="checkbox" checked={wholeDay} onChange={(e) => setWholeDay(e.target.checked)} />
            <span data-sr>ЦЕО ДАН</span>
            <span data-lat>CEO DAN</span>
          </label>

          {!wholeDay && (
            <>
              <label className="adm-form-label" data-sr>ВРЕМЕ (HH:MM)</label>
              <label className="adm-form-label" data-lat>VREME (HH:MM)</label>
              <input className="adm-input" type="time" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
            </>
          )}

          <label className="adm-form-label" data-sr>РАЗЛОГ (ОПЦИОНО)</label>
          <label className="adm-form-label" data-lat>RAZLOG (OPCIONO)</label>
          <input className="adm-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Odmor, obuka, doktor…" />

          {err && <div style={{ color: "var(--danger)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{err}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="adm-btn adm-btn-block" disabled={pending || !date} onClick={save}>
              <span data-sr>САЧУВАЈ</span>
              <span data-lat>SAČUVAJ</span>
            </button>
            <button className="adm-btn adm-btn-secondary adm-btn-block" onClick={onClose}>
              <span data-sr>ОТКАЖИ</span>
              <span data-lat>OTKAŽI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
}
