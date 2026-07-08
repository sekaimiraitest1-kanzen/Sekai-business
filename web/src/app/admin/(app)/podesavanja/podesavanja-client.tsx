"use client";

import { useState, useTransition } from "react";
import { changePin, upsertAnnouncement, deleteAnnouncement, updateSocialLinks, createStaff, resetStaffPin, toggleStaffActive, softDeleteStaff } from "./actions";
import {
  SOCIAL_PLATFORMS,
  PLATFORM_META,
  type SocialLinks,
  type SocialPlatform,
} from "@/lib/social-links";
import { InstallAppCard } from "@/components/install-app-card";
import { PushNotifCard } from "@/components/push-notif-card";

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

type StaffRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
  is_active: boolean | null;
  email: string | null;
  created_at: string | null;
};

type ArchivedStaffRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  deleted_at: string | null;
  created_at: string | null;
};

export function PodesavanjaClient({
  announcements,
  email,
  icalUrl,
  socialLinks,
  staff,
  archivedStaff,
  customerCountByStaff,
  currentUserId,
}: {
  announcements: Ann[];
  email: string;
  icalUrl: string;
  socialLinks: SocialLinks;
  staff: StaffRow[];
  archivedStaff: ArchivedStaffRow[];
  customerCountByStaff: Record<string, number>;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"pin" | "banner" | "social" | "staff" | "info">("pin");
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

      <div className="adm-toggle" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <button className={`adm-toggle-opt ${tab === "pin" ? "active" : ""}`} onClick={() => setTab("pin")} type="button">PIN</button>
        <button className={`adm-toggle-opt ${tab === "banner" ? "active" : ""}`} onClick={() => setTab("banner")} type="button">BANNER</button>
        <button className={`adm-toggle-opt ${tab === "social" ? "active" : ""}`} onClick={() => setTab("social")} type="button">
          <span data-sr>ДРУШТВЕНЕ</span><span data-lat>DRUŠTVENE</span>
        </button>
        <button className={`adm-toggle-opt ${tab === "staff" ? "active" : ""}`} onClick={() => setTab("staff")} type="button">
          <span data-sr>ЗАПОСЛЕНИ</span><span data-lat>ZAPOSLENI</span>
        </button>
        <button className={`adm-toggle-opt ${tab === "info" ? "active" : ""}`} onClick={() => setTab("info")} type="button">INFO</button>
      </div>

      {tab === "pin" && <PinChange />}
      {tab === "banner" && <Announcements list={announcements} />}
      {tab === "social" && <SocialLinksForm initial={socialLinks} />}
      {tab === "staff" && (
        <StaffManagement
          initial={staff}
          archived={archivedStaff}
          customerCountByStaff={customerCountByStaff}
          currentUserId={currentUserId}
        />
      )}
      {tab === "info" && (
        <>
          <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>SISTEM</div>
            <div className="adm-row"><span style={{ color: "rgba(245,233,208,.5)" }}>Email</span><span style={{ color: "var(--cream)" }}>{email}</span></div>
            <div className="adm-row"><span style={{ color: "rgba(245,233,208,.5)" }}>Auto-lock</span><span style={{ color: "var(--cream)" }}>24h</span></div>
            <div className="adm-row"><span style={{ color: "rgba(245,233,208,.5)" }}>Max PIN attempts</span><span style={{ color: "var(--cream)" }}>5 → lockout 10min</span></div>
          </div>

          {/* G6 — iCal feed */}
          <IcalCard icalUrl={icalUrl} />

          {/* Manual PWA install — pairs with the auto-bar from admin layout. */}
          <InstallAppCard />

          {/* Web Push subscription — relies on the PWA being installed on iOS. */}
          <PushNotifCard />
        </>
      )}
    </>
  );
}

function SocialLinksForm({ initial }: { initial: SocialLinks }) {
  const [links, setLinks] = useState<SocialLinks>(initial);
  const [errors, setErrors] = useState<Partial<Record<SocialPlatform, string>>>({});
  const [pending, start] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);

  function update(p: SocialPlatform, patch: Partial<{ enabled: boolean; url: string }>) {
    setLinks((prev) => ({ ...prev, [p]: { ...prev[p], ...patch } }));
    if (errors[p]) setErrors((prev) => ({ ...prev, [p]: undefined }));
  }

  function save() {
    setErrors({});
    setSavedFlash(false);
    start(async () => {
      const res = await updateSocialLinks(links);
      if (res.ok) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
      } else {
        setErrors(res.errors);
      }
    });
  }

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 14 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(245,233,208,.7)", lineHeight: 1.5, marginBottom: 4 }}>
        <span data-sr>
          Чекирај мреже које желиш да прикажеш у футеру сајта и упиши URL профила. Празан URL значи да се иконица скрива чак и ако је чекирано.
        </span>
        <span data-lat>
          Čekiraj mreže koje želiš da prikažeš u footer-u sajta i upiši URL profila. Prazan URL znači da se ikonica skriva čak i ako je čekirano.
        </span>
      </div>
      {SOCIAL_PLATFORMS.map((p) => {
        const meta = PLATFORM_META[p];
        const link = links[p];
        const err = errors[p];
        return (
          <div key={p} style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 10, borderBottom: "1px solid rgba(245,233,208,.06)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--cream)", fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" }}>
              <input
                type="checkbox"
                checked={link.enabled}
                onChange={(e) => update(p, { enabled: e.target.checked })}
              />
              {meta.label}
            </label>
            <input
              className="adm-input"
              type="url"
              placeholder={meta.placeholder}
              value={link.url}
              onChange={(e) => update(p, { url: e.target.value })}
              disabled={!link.enabled}
              style={{ opacity: link.enabled ? 1 : 0.4, fontSize: 12 }}
            />
            {err && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--danger)" }}>
                ⚠ {err}
              </div>
            )}
          </div>
        );
      })}
      {savedFlash && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--success)" }}>
          <span data-sr>✓ САЧУВАНО</span><span data-lat>✓ SAČUVANO</span>
        </div>
      )}
      <button className="adm-btn adm-btn-block" disabled={pending} onClick={save}>
        <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
      </button>
    </div>
  );
}

function PinChange() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  // M11: bilingual messages — `kind` decides which span to show.
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; sr: string; lat: string } | null>(null);

  function go() {
    if (next !== confirm) return setMsg({ kind: "err", sr: "PIN-ови се не поклапају", lat: "PIN-ovi se ne poklapaju" });
    if (!/^\d{4}$/.test(next)) return setMsg({ kind: "err", sr: "PIN мора имати 4 цифре", lat: "PIN mora imati 4 cifre" });
    start(async () => {
      const res = await changePin(current, next);
      if (res.ok) {
        setMsg({ kind: "ok", sr: "✓ PIN промењен", lat: "✓ PIN promenjen" });
        setCurrent(""); setNext(""); setConfirm("");
      } else if (res.error === "WRONG_CURRENT") {
        setMsg({ kind: "err", sr: "Погрешан тренутни PIN", lat: "Pogrešan trenutni PIN" });
      } else {
        setMsg({ kind: "err", sr: "Грешка", lat: "Greška" });
      }
    });
  }

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
      <label className="adm-form-label" data-sr>ТРЕНУТНИ PIN</label>
      <label className="adm-form-label" data-lat>TRENUTNI PIN</label>
      <input className="adm-input" type="password" inputMode="numeric" maxLength={4} value={current} onChange={(e) => setCurrent(e.target.value)} />
      <label className="adm-form-label" data-sr>НОВИ PIN</label>
      <label className="adm-form-label" data-lat>NOVI PIN</label>
      <input className="adm-input" type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value)} />
      <label className="adm-form-label" data-sr>ПОНОВИ НОВИ PIN</label>
      <label className="adm-form-label" data-lat>PONOVI NOVI PIN</label>
      <input className="adm-input" type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {msg && (
        <div style={{ color: msg.kind === "ok" ? "var(--success)" : "var(--danger)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
          <span data-sr>{msg.sr}</span>
          <span data-lat>{msg.lat}</span>
        </div>
      )}
      <button className="adm-btn" disabled={pending || !current || !next || !confirm} onClick={go}>
        <span data-sr>ПРОМЕНИ PIN</span>
        <span data-lat>PROMENI PIN</span>
      </button>
    </div>
  );
}

function Announcements({ list }: { list: Ann[] }) {
  const [editing, setEditing] = useState<Ann | "new" | null>(null);
  return (
    <>
      <button className="adm-btn adm-btn-block" onClick={() => setEditing("new")} style={{ marginBottom: 16 }}>
        <span data-sr>+ НОВИ БАНЕР</span>
        <span data-lat>+ NOVI BANNER</span>
      </button>
      {list.length === 0 && (
        <div className="adm-empty">
          <span data-sr>Нема банера.</span>
          <span data-lat>Nema banner-a.</span>
        </div>
      )}
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
  const [titleLat, setTitleLat] = useState(ann?.title_lat ?? "");
  const [bodyLat, setBodyLat] = useState(ann?.body_lat ?? "");
  const [active, setActive] = useState(ann?.active ?? true);
  // M12: time-window inputs. Schema is timestamptz; <input type="datetime-local"> emits
  // YYYY-MM-DDTHH:mm (no TZ); we normalize to ISO with Belgrade offset before save.
  const [startsAt, setStartsAt] = useState(ann?.starts_at ? toLocalInput(ann.starts_at) : "");
  const [endsAt, setEndsAt] = useState(ann?.ends_at ? toLocalInput(ann.ends_at) : "");
  const [pending, start] = useTransition();
  const canSave = !!bodyLat.trim();
  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">
          <span data-sr>{ann ? "ИЗМЕНИ" : "НОВИ"} БАНЕР</span>
          <span data-lat>{ann ? "IZMENI" : "NOVI"} BANNER</span>
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="adm-form-label">NASLOV</label>
          <input className="adm-input" value={titleLat} onChange={(e) => setTitleLat(e.target.value)} />
          <label className="adm-form-label">PORUKA</label>
          <textarea className="adm-input" rows={2} value={bodyLat} onChange={(e) => setBodyLat(e.target.value)} placeholder="Zatvoreno 5—7. maja zbog renoviranja" />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="adm-form-label" data-sr>ОД (опционо)</label>
              <label className="adm-form-label" data-lat>OD (opciono)</label>
              <input className="adm-input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="adm-form-label" data-sr>ДО (опционо)</label>
              <label className="adm-form-label" data-lat>DO (opciono)</label>
              <input className="adm-input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--cream)" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span data-sr>АКТИВАН (видљив на сајту)</span>
            <span data-lat>AKTIVAN (vidljiv na sajtu)</span>
          </label>
          {!canSave && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.5)" }}>
              <span data-sr>Попуни поруку.</span>
              <span data-lat>Popuni poruku.</span>
            </div>
          )}
          <button className="adm-btn adm-btn-block" disabled={pending || !canSave} onClick={() => start(async () => {
            await upsertAnnouncement({
              id: ann?.id,
              title_sr: titleLat,
              title_lat: titleLat,
              body_sr: bodyLat,
              body_lat: bodyLat,
              active,
              starts_at: startsAt ? new Date(startsAt).toISOString() : null,
              ends_at: endsAt ? new Date(endsAt).toISOString() : null,
            });
            onClose();
          })}>
            <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
          </button>
          {ann && <button className="adm-btn adm-btn-danger adm-btn-block" disabled={pending} onClick={() => { if (confirm("Obrisati?")) start(async () => { await deleteAnnouncement(ann.id); onClose(); }); }}>
            <span data-sr>ОБРИШИ</span><span data-lat>OBRIŠI</span>
          </button>}
          <button className="adm-btn adm-btn-secondary adm-btn-block" onClick={onClose}>
            <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Convert a UTC ISO timestamp from DB to the local YYYY-MM-DDTHH:MM form
 *  consumed by <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function IcalCard({ icalUrl }: { icalUrl: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(icalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", marginTop: 12 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
        📅 KALENDAR (iCal)
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(245,233,208,.7)", lineHeight: 1.5, marginBottom: 8 }}>
        <span data-sr>
          Залепи овај линк у Google Calendar (Add → From URL) или у iPhone Settings → Mail → Accounts → Add → Other → Subscribed Calendar.
          Телефон ће се аутоматски освежавати на сваких ~сат времена.
        </span>
        <span data-lat>
          Zalepi ovaj link u Google Calendar (Add → From URL) ili u iPhone Settings → Mail → Accounts → Add → Other → Subscribed Calendar.
          Telefon će se automatski osvežavati na svakih ~sat vremena.
        </span>
      </div>
      <input
        className="adm-input"
        readOnly
        value={icalUrl}
        onClick={(e) => (e.target as HTMLInputElement).select()}
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
      />
      <button className="adm-btn adm-btn-secondary" onClick={copy} style={{ marginTop: 8 }}>
        {copied ? "✓ KOPIRAN" : (
          <>
            <span data-sr>📋 КОПИРАЈ ЛИНК</span>
            <span data-lat>📋 KOPIRAJ LINK</span>
          </>
        )}
      </button>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)", marginTop: 6 }}>
        ⚠ <span data-sr>Свако са линком може видети термине. Не дели.</span>
        <span data-lat>Svako sa linkom može videti termine. Ne deli.</span>
      </div>
    </div>
  );
}

// ─── Staff management (owner-only tab) ──────────────────────────────────
//
// Two stacked sections:
//   1. AKTIVNI — current employees + owner. Owner row has no actions
//      (avoid self-lock-out); staff rows get pause / reset-PIN / delete.
//   2. ARHIVA — soft-deleted ex-employees with their captured HR record
//      (full name, phone, email) + lifetime customer count for reference.
function StaffManagement({
  initial,
  archived,
  customerCountByStaff,
  currentUserId,
}: {
  initial: StaffRow[];
  archived: ArchivedStaffRow[];
  customerCountByStaff: Record<string, number>;
  currentUserId: string;
}) {
  const [rows, setRows] = useState<StaffRow[]>(initial);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, start] = useTransition();
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function flashError(code: string) {
    const map: Record<string, string> = {
      INVALID_NAME: "Ime mora imati 2-40 znakova.",
      INVALID_PIN: "PIN mora biti 4-8 cifara.",
      PIN_COLLISION: "Taj PIN već koristi drugi nalog. Izaberi drugi.",
      DB_FAILED: "Greška pri snimanju.",
      NOT_FOUND: "Nalog nije pronađen.",
      CANT_DISABLE_SELF: "Ne možeš isključiti sebe.",
      CANT_DISABLE_OWNER: "Vlasnički nalog se ne može isključiti.",
      CANT_DELETE_SELF: "Ne možeš obrisati sebe.",
      CANT_DELETE_OWNER: "Vlasnički nalog se ne može obrisati.",
      FORBIDDEN_STAFF: "Samo vlasnik.",
    };
    setErrMsg(map[code] ?? code);
    setTimeout(() => setErrMsg(null), 4000);
  }

  async function handleCreate(formData: FormData) {
    const firstName = String(formData.get("firstName") ?? "");
    const lastName = String(formData.get("lastName") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const emailValue = String(formData.get("email") ?? "");
    const pin = String(formData.get("pin") ?? "");
    start(async () => {
      const res = await createStaff({ firstName, lastName, phone, email: emailValue, pin });
      if (!res.ok) {
        flashError(res.error);
        return;
      }
      setCreateOpen(false);
      window.location.reload();
    });
  }

  async function handleResetPin(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    const newPin = String(formData.get("newPin") ?? "");
    start(async () => {
      const res = await resetStaffPin(id, newPin);
      if (!res.ok) {
        flashError(res.error);
        return;
      }
      setResetFor(null);
    });
  }

  async function handleToggle(id: string) {
    start(async () => {
      const res = await toggleStaffActive(id);
      if (!res.ok) {
        flashError(res.error);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: res.isActive } : r)));
    });
  }

  async function handleDelete(id: string) {
    start(async () => {
      const res = await softDeleteStaff(id);
      if (!res.ok) {
        flashError(res.error);
        return;
      }
      // Reload so the row migrates from active to archived without
      // duplicating it in client state.
      window.location.reload();
    });
  }

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
      {errMsg && (
        <div className="adm-banner" style={{ background: "rgba(255,80,80,.12)", color: "#ffb0b0", padding: 10, borderRadius: 6 }}>
          {errMsg}
        </div>
      )}

      {/* ── Active roster ─────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
          <span data-sr>АКТИВНИ</span>
          <span data-lat>AKTIVNI</span>
        </div>
        <button type="button" className="adm-btn-primary" onClick={() => setCreateOpen(true)} style={{ fontSize: 12 }}>
          + <span data-sr>ДОДАЈ</span><span data-lat>DODAJ</span>
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="adm-empty" style={{ padding: 16 }}>
          <span data-sr>Још нема запослених.</span>
          <span data-lat>Još nema zaposlenih.</span>
        </div>
      ) : (
        <div>
          {rows.map((r) => {
            const isOwnerRow = r.role !== "staff";
            const isMe = r.id === currentUserId;
            const customerCount = customerCountByStaff[r.id] ?? 0;
            const fullName = r.display_name || [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "—";
            return (
              <div key={r.id} className="adm-row" style={{ flexDirection: "column", alignItems: "stretch", paddingTop: 10, paddingBottom: 10, opacity: r.is_active ? 1 : 0.4, gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--cream)", fontWeight: 600, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {fullName}
                      {isOwnerRow && <span style={{ background: "var(--mustard)", color: "var(--brown-950)", fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>ВЛАСНИК</span>}
                      {!isOwnerRow && !r.is_active && <span style={{ background: "rgba(255,80,80,.18)", color: "#ffb0b0", fontSize: 9, padding: "1px 5px", borderRadius: 3 }}>ПАУЗА</span>}
                      {isMe && <span style={{ opacity: 0.4, fontSize: 10 }}>(ja)</span>}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {r.phone && <span>📞 {r.phone}</span>}
                      {!isOwnerRow && customerCount > 0 && <span>👤 {customerCount} muš.</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {!isOwnerRow && (
                      <>
                        <button type="button" className="adm-btn-secondary" disabled={pending} onClick={() => setResetFor(r.id)} style={{ fontSize: 11, padding: "6px 10px" }}>
                          🔑 PIN
                        </button>
                        <button type="button" className="adm-btn-secondary" disabled={pending || isMe} onClick={() => handleToggle(r.id)} style={{ fontSize: 11, padding: "6px 10px" }}>
                          {r.is_active ? "⏸" : "▶"}
                        </button>
                        <button type="button" className="adm-btn-secondary" disabled={pending || isMe} onClick={() => setConfirmDeleteFor(r.id)} style={{ fontSize: 11, padding: "6px 10px", color: "#ffb0b0" }}>
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {confirmDeleteFor === r.id && (
                  <div style={{ background: "rgba(255,80,80,.08)", padding: 10, borderRadius: 6, fontSize: 12, color: "rgba(245,233,208,.8)", lineHeight: 1.5 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span data-sr>Сигуран да бришеш {fullName}? Прешао у архиву, прошли термини остају.</span>
                      <span data-lat>Siguran da brišeš {fullName}? Prelazi u arhivu, prošli termini ostaju.</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="adm-btn-secondary" onClick={() => setConfirmDeleteFor(null)} disabled={pending} style={{ flex: 1, fontSize: 11 }}>
                        <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
                      </button>
                      <button type="button" className="adm-btn" style={{ background: "rgba(255,80,80,.85)", color: "#1A0F05", flex: 1, fontSize: 11 }} disabled={pending} onClick={() => handleDelete(r.id)}>
                        🗑 <span data-sr>ОБРИШИ</span><span data-lat>OBRIŠI</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create form ───────────────────────────────────────────── */}
      {createOpen && (
        <form action={handleCreate} style={{ borderTop: "1px solid rgba(245,233,208,.1)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
            <span data-sr>НОВИ ЗАПОСЛЕНИ</span>
            <span data-lat>NOVI ZAPOSLENI</span>
          </div>
          <input type="text" name="firstName" placeholder="Ime (obavezno)" className="adm-input" minLength={2} maxLength={40} required />
          <input type="text" name="lastName" placeholder="Prezime" className="adm-input" maxLength={40} />
          <input type="tel" name="phone" placeholder="Telefon" className="adm-input" maxLength={30} />
          <input type="email" name="email" placeholder="Email" className="adm-input" maxLength={120} />
          <input
            type="text"
            name="pin"
            inputMode="numeric"
            pattern="\d{4,8}"
            placeholder="PIN za login (4-8 cifara, obavezno)"
            className="adm-input"
            required
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="adm-btn-secondary" onClick={() => setCreateOpen(false)} disabled={pending} style={{ flex: 1 }}>
              <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
            </button>
            <button type="submit" className="adm-btn-primary" disabled={pending} style={{ flex: 1 }}>
              <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
            </button>
          </div>
        </form>
      )}

      {resetFor && (
        <form action={handleResetPin} style={{ borderTop: "1px solid rgba(245,233,208,.1)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
            <span data-sr>НОВИ PIN ЗА: </span>
            <span data-lat>NOVI PIN ZA: </span>
            <span style={{ color: "var(--cream)" }}>{rows.find((r) => r.id === resetFor)?.display_name ?? "—"}</span>
          </div>
          <input type="hidden" name="id" value={resetFor} />
          <input
            type="text"
            name="newPin"
            inputMode="numeric"
            pattern="\d{4,8}"
            placeholder="PIN (4-8 cifara)"
            className="adm-input"
            required
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="adm-btn-secondary" onClick={() => setResetFor(null)} disabled={pending} style={{ flex: 1 }}>
              <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
            </button>
            <button type="submit" className="adm-btn-primary" disabled={pending} style={{ flex: 1 }}>
              <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
            </button>
          </div>
        </form>
      )}

      {/* ── Archive of ex-employees ───────────────────────────────── */}
      {archived.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(245,233,208,.1)" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "rgba(245,233,208,.5)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>
            <span data-sr>АРХИВА</span>
            <span data-lat>ARHIVA</span>
            <span style={{ marginLeft: 6, opacity: 0.6 }}>· {archived.length}</span>
          </div>
          {archived.map((a) => {
            const fullName = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.display_name || "—";
            const customerCount = customerCountByStaff[a.id] ?? 0;
            const deletedDate = a.deleted_at ? new Date(a.deleted_at).toLocaleDateString("sr-Latn-RS") : "—";
            const isPlaceholderEmail = (a.email ?? "").includes("@") && (a.email ?? "").endsWith(".local");
            return (
              <div key={a.id} className="adm-row" style={{ flexDirection: "column", alignItems: "stretch", paddingTop: 10, paddingBottom: 10, gap: 4, opacity: 0.65 }}>
                <div style={{ color: "var(--cream)", fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
                  {fullName}
                  <span style={{ background: "rgba(245,233,208,.08)", color: "rgba(245,233,208,.55)", fontSize: 9, padding: "1px 5px", borderRadius: 3 }}>
                    ОБРИСАН · {deletedDate}
                  </span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.5)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {a.phone && <span>📞 {a.phone}</span>}
                  {a.email && !isPlaceholderEmail && <span>✉ {a.email}</span>}
                  <span>👤 {customerCount} muš.</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
