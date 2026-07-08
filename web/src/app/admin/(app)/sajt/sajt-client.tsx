"use client";

import { useState, useTransition } from "react";
import { upsertContent, updateSalon } from "./actions";

type Salon = { name: string; address: string | null; phone: string | null; email: string | null; working_hours: WH | null } | null;
type WH = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string } | null>;
type ContentRow = { key: string; value_sr: string | null; value_lat: string | null };

const CONTENT_KEYS = [
  { key: "hero_eyebrow", labelSr: "Hero · Етикета изнад наслова", labelLat: "Hero · Etiketa iznad naslova" },
  { key: "hero_title", labelSr: "Hero · Главни наслов", labelLat: "Hero · Glavni naslov" },
  { key: "hero_subtitle", labelSr: "Hero · Поднаслов", labelLat: "Hero · Podnaslov" },
  { key: "hero_tagline", labelSr: "Hero · Слоган испод", labelLat: "Hero · Slogan ispod" },
  { key: "about_title", labelSr: "О нама · Наслов", labelLat: "O nama · Naslov" },
  { key: "about_story", labelSr: "О нама · Прича", labelLat: "O nama · Priča" },
  { key: "review_1", labelSr: "Утисак 1", labelLat: "Utisak 1" },
  { key: "review_2", labelSr: "Утисак 2", labelLat: "Utisak 2" },
  { key: "review_3", labelSr: "Утисак 3", labelLat: "Utisak 3" },
] as const;

const DAYS: { key: keyof WH; sr: string; lat: string }[] = [
  { key: "mon", sr: "Понедељак", lat: "Ponedeljak" },
  { key: "tue", sr: "Уторак", lat: "Utorak" },
  { key: "wed", sr: "Среда", lat: "Sreda" },
  { key: "thu", sr: "Четвртак", lat: "Četvrtak" },
  { key: "fri", sr: "Петак", lat: "Petak" },
  { key: "sat", sr: "Субота", lat: "Subota" },
  { key: "sun", sr: "Недеља", lat: "Nedelja" },
];

export function SajtClient({ salon, content }: { salon: Salon; content: ContentRow[] }) {
  const [tab, setTab] = useState<"text" | "kontakt" | "vreme">("text");
  const map = Object.fromEntries(content.map((c) => [c.key, c]));

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>САЈТ САДРЖАЈ</span>
            <span data-lat>SAJT SADRŽAJ</span>
          </div>
          <div className="adm-page-subtitle">
            <span data-sr>Уреди шта се види на јавном сајту</span>
            <span data-lat>Uredi šta se vidi na javnom sajtu</span>
          </div>
        </div>
      </div>

      <div className="adm-toggle" style={{ marginBottom: 16 }}>
        <button className={`adm-toggle-opt ${tab === "text" ? "active" : ""}`} onClick={() => setTab("text")} type="button">
          <span data-sr>ТЕКСТ</span><span data-lat>TEKST</span>
        </button>
        <button className={`adm-toggle-opt ${tab === "kontakt" ? "active" : ""}`} onClick={() => setTab("kontakt")} type="button">
          KONTAKT
        </button>
        <button className={`adm-toggle-opt ${tab === "vreme" ? "active" : ""}`} onClick={() => setTab("vreme")} type="button">
          <span data-sr>ВРЕМЕ</span><span data-lat>VREME</span>
        </button>
      </div>

      {tab === "text" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CONTENT_KEYS.map((c) => (
            <ContentEditor key={c.key} keyName={c.key} labelSr={c.labelSr} labelLat={c.labelLat} initial={map[c.key] ?? null} />
          ))}
        </div>
      )}

      {tab === "kontakt" && salon && <KontaktEditor salon={salon} />}
      {tab === "vreme" && salon && <VremeEditor workingHours={salon.working_hours ?? defaultWH()} />}
    </>
  );
}

function defaultWH(): WH {
  return {
    mon: { open: "09:00", close: "20:00" },
    tue: { open: "09:00", close: "20:00" },
    wed: { open: "09:00", close: "20:00" },
    thu: { open: "09:00", close: "20:00" },
    fri: { open: "09:00", close: "20:00" },
    sat: { open: "09:00", close: "17:00" },
    sun: null,
  };
}

function ContentEditor({ keyName, labelSr, labelLat, initial }: { keyName: string; labelSr: string; labelLat: string; initial: ContentRow | null }) {
  const [lat, setLat] = useState(initial?.value_lat ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const isLong = keyName.includes("story") || keyName.startsWith("review");

  function save() {
    start(async () => {
      // English toggle mirrors the Latin text — there's no separate
      // translation field in the admin anymore, just one plain text box.
      await upsertContent(keyName, lat, lat);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 600, color: "var(--mustard)", letterSpacing: ".08em", textTransform: "uppercase" }}>
        <span data-sr>{labelSr}</span>
        <span data-lat>{labelLat}</span>
      </div>
      {isLong ? (
        <textarea className="adm-input" rows={4} value={lat} onChange={(e) => setLat(e.target.value)} />
      ) : (
        <input className="adm-input" value={lat} onChange={(e) => setLat(e.target.value)} />
      )}
      <button className="adm-btn" disabled={pending} onClick={save}>
        {saved ? "✓ SAČUVANO" : pending ? "..." : (
          <>
            <span data-sr>САЧУВАЈ</span>
            <span data-lat>SAČUVAJ</span>
          </>
        )}
      </button>
    </div>
  );
}

function KontaktEditor({ salon }: { salon: NonNullable<Salon> }) {
  const [name, setName] = useState(salon.name);
  const [address, setAddress] = useState(salon.address ?? "");
  const [phone, setPhone] = useState(salon.phone ?? "");
  const [email, setEmail] = useState(salon.email ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
      <label className="adm-form-label" data-sr>НАЗИВ САЛОНА</label>
      <label className="adm-form-label" data-lat>NAZIV SALONA</label>
      <input className="adm-input" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="adm-form-label" data-sr>АДРЕСА</label>
      <label className="adm-form-label" data-lat>ADRESA</label>
      <input className="adm-input" value={address} onChange={(e) => setAddress(e.target.value)} />
      <label className="adm-form-label" data-sr>ТЕЛЕФОН</label>
      <label className="adm-form-label" data-lat>TELEFON</label>
      <input className="adm-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <label className="adm-form-label" data-sr>ИМEJЛ</label>
      <label className="adm-form-label" data-lat>EMAIL</label>
      <input className="adm-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="adm-btn" disabled={pending} onClick={() => start(async () => {
        await updateSalon({ name, address, phone, email });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      })}>
        {saved ? "✓ SAČUVANO" : <>
          <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
        </>}
      </button>
    </div>
  );
}

function VremeEditor({ workingHours }: { workingHours: WH }) {
  const [wh, setWh] = useState<WH>(workingHours);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function setDay(key: keyof WH, val: { open: string; close: string } | null) {
    setWh({ ...wh, [key]: val });
  }

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
      {DAYS.map((d) => {
        const v = wh[d.key];
        return (
          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, fontFamily: "'Oswald', sans-serif", fontSize: 13, color: "var(--cream)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              <span data-sr>{d.sr}</span><span data-lat>{d.lat}</span>
            </div>
            {v ? (
              <>
                <input className="adm-input" type="time" value={v.open} onChange={(e) => setDay(d.key, { ...v, open: e.target.value })} style={{ width: 90 }} />
                <span style={{ color: "rgba(245,233,208,.4)" }}>—</span>
                <input className="adm-input" type="time" value={v.close} onChange={(e) => setDay(d.key, { ...v, close: e.target.value })} style={{ width: 90 }} />
                <button className="adm-app-bar-btn" type="button" onClick={() => setDay(d.key, null)} style={{ width: 32, height: 32, color: "var(--danger)" }}>✕</button>
              </>
            ) : (
              <button className="adm-btn adm-btn-secondary" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => setDay(d.key, { open: "09:00", close: "20:00" })}>
                + OPEN
              </button>
            )}
          </div>
        );
      })}

      <button className="adm-btn" disabled={pending} onClick={() => start(async () => {
        await updateSalon({ workingHours: wh });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      })}>
        {saved ? "✓ SAČUVANO" : <>
          <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
        </>}
      </button>
    </div>
  );
}
