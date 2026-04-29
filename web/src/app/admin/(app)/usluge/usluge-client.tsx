"use client";

import { useState, useTransition } from "react";
import { upsertService, deleteService, toggleServiceActive } from "./actions";

type Service = {
  id: string;
  name_sr: string;
  name_lat: string;
  price: number;
  duration_min: number;
  active: boolean;
  sort_order: number;
};

export function UslugeClient({ services }: { services: Service[] }) {
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [pending, start] = useTransition();
  const activeCount = services.filter((s) => s.active).length;

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>УСЛУГЕ</span>
            <span data-lat>USLUGE</span>
          </div>
          <div className="adm-page-subtitle">
            {activeCount} aktivnih · {services.length - activeCount} neaktivnih
          </div>
        </div>
        <button className="adm-fab-btn" type="button" onClick={() => setEditing("new")}>+</button>
      </div>

      <div className="adm-banner info">
        🎁 <span data-sr>LOYALTY: 6. шишање GRATIS или 10% попуст у Shop-у</span>
        <span data-lat>LOYALTY: 6. šišanje GRATIS ili 10% popust u Shop-u</span>
      </div>

      {services.length === 0 && (
        <div className="adm-empty">
          <span data-sr>Нема услуга. Додај прву.</span>
          <span data-lat>Nema usluga. Dodaj prvu.</span>
        </div>
      )}

      {services.map((s) => (
        <div key={s.id} className="adm-card" style={{ opacity: s.active ? 1 : 0.5 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 900, fontStyle: "italic", color: "var(--cream)" }}>
              <span data-sr>{s.name_sr}</span>
              <span data-lat>{s.name_lat}</span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.4)", letterSpacing: ".06em", marginTop: 2 }}>
              {s.duration_min} MIN
            </div>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: "italic", color: "var(--mustard)", marginRight: 8 }}>
            {s.price}<span style={{ fontSize: 11, marginLeft: 2 }}>RSD</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              className="adm-app-bar-btn"
              type="button"
              onClick={() => setEditing(s)}
              style={{ width: 32, height: 32 }}
            >
              ✎
            </button>
            <button
              className="adm-app-bar-btn"
              type="button"
              style={{ width: 32, height: 32, color: s.active ? "var(--success)" : "rgba(245,233,208,.3)" }}
              disabled={pending}
              onClick={() => start(() => { void toggleServiceActive(s.id, !s.active); })}
              aria-label="toggle"
            >
              {s.active ? "●" : "○"}
            </button>
          </div>
        </div>
      ))}

      {editing && <ServiceEditor service={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ServiceEditor({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const [name_sr, setNameSr] = useState(service?.name_sr ?? "");
  const [name_lat, setNameLat] = useState(service?.name_lat ?? "");
  const [price, setPrice] = useState(service?.price.toString() ?? "");
  const [duration_min, setDuration] = useState(service?.duration_min.toString() ?? "30");
  const [active, setActive] = useState(service?.active ?? true);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await upsertService({
        id: service?.id,
        name_sr: name_sr.trim(),
        name_lat: name_lat.trim(),
        price: parseInt(price) || 0,
        duration_min: parseInt(duration_min) || 30,
        active,
        sort_order: service?.sort_order,
      });
      onClose();
    });
  }

  function remove() {
    if (!service) return;
    if (!confirm(`Obrisi uslugu "${service.name_lat}"?`)) return;
    start(async () => {
      await deleteService(service.id);
      onClose();
    });
  }

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet">
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">
          {service ? (
            <>
              <span data-sr>ИЗМЕНИ УСЛУГУ</span>
              <span data-lat>IZMENI USLUGU</span>
            </>
          ) : (
            <>
              <span data-sr>НОВА УСЛУГА</span>
              <span data-lat>NOVA USLUGA</span>
            </>
          )}
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="adm-form-label" data-sr>НАЗИВ (ЋИРИЛИЦА)</label>
            <label className="adm-form-label" data-lat>NAZIV (ĆIRILICA)</label>
            <input className="adm-input" value={name_sr} onChange={(e) => setNameSr(e.target.value)} placeholder="Шишање" />
          </div>
          <div>
            <label className="adm-form-label" data-sr>НАЗИВ (ЛАТИНИЦА)</label>
            <label className="adm-form-label" data-lat>NAZIV (LATINICA)</label>
            <input className="adm-input" value={name_lat} onChange={(e) => setNameLat(e.target.value)} placeholder="Šišanje" />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="adm-form-label">CENA (RSD)</label>
              <input className="adm-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="900" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="adm-form-label">TRAJANJE (MIN)</label>
              <input className="adm-input" type="number" value={duration_min} onChange={(e) => setDuration(e.target.value)} placeholder="30" />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--cream)", fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: ".06em" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span data-sr>АКТИВНА (видљива на сајту)</span>
            <span data-lat>AKTIVNA (vidljiva na sajtu)</span>
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="adm-btn adm-btn-block" disabled={pending || !name_sr || !name_lat || !price} onClick={save}>
              <span data-sr>САЧУВАЈ</span>
              <span data-lat>SAČUVAJ</span>
            </button>
            <button className="adm-btn adm-btn-secondary adm-btn-block" onClick={onClose}>
              <span data-sr>ОТКАЖИ</span>
              <span data-lat>OTKAŽI</span>
            </button>
          </div>
          {service && (
            <button className="adm-btn adm-btn-danger adm-btn-block" disabled={pending} onClick={remove}>
              <span data-sr>ОБРИШИ</span>
              <span data-lat>OBRIŠI</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
