"use client";

import { useState, useTransition } from "react";
import { compressToWebP } from "@/lib/storage/compress-client";
import { updateBarberProfile, uploadBarberPhoto, type BarberProfile } from "./actions";

export function BerberiClient({ barbers: initial }: { barbers: BarberProfile[] }) {
  const [barbers, setBarbers] = useState(initial);
  const [editing, setEditing] = useState<BarberProfile | null>(null);
  const [pending, start] = useTransition();

  function patchLocal(id: string, patch: Partial<BarberProfile>) {
    setBarbers((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>БЕРБЕРИ</span>
            <span data-lat>BERBERI</span>
          </div>
          <div className="adm-page-subtitle">{barbers.length} zaposlenih</div>
        </div>
      </div>

      {barbers.length === 0 && (
        <div className="adm-empty">
          <span data-sr>Нема запослених. Додај их у Подешавања.</span>
          <span data-lat>Nema zaposlenih. Dodaj ih u Podešavanja.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {barbers.map((b) => (
          <button
            key={b.id}
            type="button"
            className="adm-list-row"
            onClick={() => setEditing(b)}
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left" }}
          >
            <div style={{ width: 44, height: 44, flexShrink: 0, background: "var(--brown-900)", overflow: "hidden" }}>
              {b.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{b.display_name ?? "—"}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{b.role_title_lat ?? "—"}</div>
            </div>
            <span
              style={{
                fontSize: 10,
                letterSpacing: ".08em",
                padding: "3px 8px",
                background: b.show_on_site ? "var(--mustard)" : "transparent",
                border: b.show_on_site ? "none" : "1px solid rgba(239,233,221,.2)",
                color: b.show_on_site ? "var(--brown-950)" : "rgba(239,233,221,.5)",
              }}
            >
              {b.show_on_site ? "ONLINE" : "SAKRIVEN"}
            </span>
          </button>
        ))}
      </div>

      {editing && (
        <BarberEditor
          barber={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            patchLocal(editing.id, patch);
            start(async () => { await updateBarberProfile(editing.id, patch); });
          }}
          onUpload={async (file) => {
            const { blob, filename } = await compressToWebP(file);
            const fd = new FormData();
            fd.append("filename", filename);
            fd.append("file", blob, filename);
            const res = await uploadBarberPhoto(editing.id, fd);
            if (res.ok) patchLocal(editing.id, { photo_url: res.url });
          }}
        />
      )}
    </>
  );
}

function BarberEditor({
  barber,
  pending,
  onClose,
  onSave,
  onUpload,
}: {
  barber: BarberProfile;
  pending: boolean;
  onClose: () => void;
  onSave: (patch: Partial<BarberProfile>) => void;
  onUpload: (file: File) => void;
}) {
  const [roleTitleSr, setRoleTitleSr] = useState(barber.role_title_sr ?? "");
  const [roleTitleLat, setRoleTitleLat] = useState(barber.role_title_lat ?? "");
  const [specialtySr, setSpecialtySr] = useState(barber.specialty_sr ?? "");
  const [specialtyLat, setSpecialtyLat] = useState(barber.specialty_lat ?? "");
  const [bioSr, setBioSr] = useState(barber.bio_sr ?? "");
  const [bioLat, setBioLat] = useState(barber.bio_lat ?? "");
  const [showOnSite, setShowOnSite] = useState(barber.show_on_site);

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet">
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">{barber.display_name}</div>
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ width: "100%", height: 160, background: "var(--brown-900)", marginBottom: 12, overflow: "hidden" }}>
            {barber.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={barber.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} style={{ marginBottom: 16 }} />

          <label className="adm-form-label">TITULA (ćir.)</label>
          <input className="adm-input" value={roleTitleSr} onChange={(e) => setRoleTitleSr(e.target.value)} placeholder="OWNER · MASTER BARBER" style={{ marginBottom: 8 }} />
          <label className="adm-form-label">TITULA (lat.)</label>
          <input className="adm-input" value={roleTitleLat} onChange={(e) => setRoleTitleLat(e.target.value)} placeholder="VLASNIK · MASTER BARBER" style={{ marginBottom: 8 }} />

          <label className="adm-form-label">SPECIJALNOST — chip (ćir.)</label>
          <input className="adm-input" value={specialtySr} onChange={(e) => setSpecialtySr(e.target.value)} placeholder="FADE · BEARD" style={{ marginBottom: 8 }} />
          <label className="adm-form-label">SPECIJALNOST — chip (lat.)</label>
          <input className="adm-input" value={specialtyLat} onChange={(e) => setSpecialtyLat(e.target.value)} placeholder="FADE · BRADA" style={{ marginBottom: 8 }} />

          <label className="adm-form-label">BIO (ćir.)</label>
          <textarea className="adm-input" value={bioSr} onChange={(e) => setBioSr(e.target.value)} rows={3} style={{ marginBottom: 8 }} />
          <label className="adm-form-label">BIO (lat.)</label>
          <textarea className="adm-input" value={bioLat} onChange={(e) => setBioLat(e.target.value)} rows={3} style={{ marginBottom: 12 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={showOnSite} onChange={(e) => setShowOnSite(e.target.checked)} />
            <span data-sr>Прикажи на сајту (може се резервисати)</span>
            <span data-lat>Prikaži na sajtu (može se rezervisati)</span>
          </label>

          <button
            className="adm-btn adm-btn-block"
            disabled={pending}
            onClick={() => {
              onSave({
                role_title_sr: roleTitleSr,
                role_title_lat: roleTitleLat,
                specialty_sr: specialtySr,
                specialty_lat: specialtyLat,
                bio_sr: bioSr,
                bio_lat: bioLat,
                show_on_site: showOnSite,
              });
              onClose();
            }}
          >
            <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
          </button>
          <button className="adm-btn adm-btn-secondary adm-btn-block" style={{ marginTop: 8 }} onClick={onClose}>
            <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
          </button>
        </div>
      </div>
    </div>
  );
}
