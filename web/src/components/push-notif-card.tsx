"use client";

import { useEffect, useState, useTransition } from "react";
import { subscribePush, unsubscribePush, sendTestPush } from "@/app/admin/(app)/podesavanja/push-actions";

type Status =
  | { kind: "loading" }
  | { kind: "unsupported" }
  | { kind: "blocked" }
  | { kind: "needs-permission" }
  | { kind: "needs-subscribe" }
  | { kind: "subscribed" };

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/**
 * Manages the device's Web Push subscription for the logged-in admin.
 * Mounts inside the INFO tab of /admin/podešavanja, paired with the
 * PWA install card already there. Three real-world buckets:
 *
 *   - Browser doesn't support Notification + PushManager
 *     (older iOS, in-app browsers) → "unsupported" state, no buttons.
 *   - Permission denied at OS / browser level → "blocked" state, link
 *     to manual instructions.
 *   - Permission default OR not yet subscribed → button to enable.
 *   - Already subscribed → status pill + "test" button + "isključi".
 */
export function PushNotifCard() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; sr: string; lat: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    refreshStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => { cancelled = true; };
  }, []);

  function showFlash(kind: "ok" | "err", sr: string, lat: string) {
    setFlash({ kind, sr, lat });
    setTimeout(() => setFlash(null), 3500);
  }

  async function refresh() {
    setStatus(await refreshStatus());
  }

  async function enable() {
    setFlash(null);
    if (!PUBLIC_KEY) {
      showFlash("err", "VAPID кључ није подешен на серверу.", "VAPID ključ nije podešen na serveru.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === "denied") {
        showFlash("err", "Дозвола одбијена. Укључи у подешавањима телефона.", "Dozvola odbijena. Uključi u podešavanjima telefona.");
        await refresh();
        return;
      }
      if (perm !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // BufferSource cast: TS 5.x types Uint8Array as
        // Uint8Array<ArrayBufferLike> which the DOM lib's
        // PushSubscriptionOptionsInit doesn't accept directly. The runtime
        // value is a plain ArrayBuffer-backed view, which is fine.
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY) as unknown as BufferSource,
      });
      const json = sub.toJSON();
      const res = await subscribePush({
        endpoint: json.endpoint ?? "",
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      if (!res.ok) {
        showFlash("err", "Неуспело пријављивање на сервер.", "Neuspelo prijavljivanje na server.");
        return;
      }
      await refresh();
      showFlash("ok", "✓ Нотификације укључене.", "✓ Notifikacije uključene.");
    } catch (e) {
      console.error("[push] enable failed:", e);
      showFlash("err", "Нешто није у реду. Покушај поново.", "Nešto nije u redu. Pokušaj ponovo.");
    }
  }

  async function disable() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      await refresh();
      showFlash("ok", "Нотификације искључене.", "Notifikacije isključene.");
    } catch (e) {
      console.error("[push] disable failed:", e);
      showFlash("err", "Грешка при искључивању.", "Greška pri isključivanju.");
    }
  }

  async function test() {
    const res = await sendTestPush();
    if (res.ok && res.sent > 0) {
      showFlash("ok", `Послато (${res.sent}). Сачекај пар секунди.`, `Poslato (${res.sent}). Sačekaj par sekundi.`);
    } else {
      showFlash("err", "Нема активних претплата.", "Nema aktivnih pretplata.");
    }
  }

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", marginTop: 12, gap: 10 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
        🔔 <span data-sr>НОТИФИКАЦИЈЕ</span><span data-lat>NOTIFIKACIJE</span>
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(245,233,208,.7)", lineHeight: 1.5 }}>
        <span data-sr>
          Када стигне нов термин, телефон зазвони и обавештење се појави на закључаном екрану. Радиш на iPhone-у? Прво инсталирај апликацију (горње дугме).
        </span>
        <span data-lat>
          Kada stigne nov termin, telefon zazvoni i obaveštenje se pojavi na zaključanom ekranu. Radiš na iPhone-u? Prvo instaliraj aplikaciju (gornje dugme).
        </span>
      </div>

      {status.kind === "loading" && (
        <Pill color="rgba(245,233,208,.5)" sr="Учитавам…" lat="Učitavam…" />
      )}
      {status.kind === "unsupported" && (
        <Pill
          color="rgba(245,233,208,.55)"
          dashed
          sr="Овај прегледач не подржава push нотификације."
          lat="Ovaj pregledač ne podržava push notifikacije."
        />
      )}
      {status.kind === "blocked" && (
        <Pill
          color="var(--danger)"
          dashed
          sr="Дозвола одбијена. Отвори подешавања сајта/апликације и дозволи нотификације, па освежи страницу."
          lat="Dozvola odbijena. Otvori podešavanja sajta/aplikacije i dozvoli notifikacije, pa osveži stranicu."
        />
      )}
      {(status.kind === "needs-permission" || status.kind === "needs-subscribe") && (
        <button
          type="button"
          className="adm-btn adm-btn-block"
          disabled={pending}
          onClick={() => start(enable)}
        >
          🔔 <span data-sr>УКЉУЧИ НОТИФИКАЦИЈЕ</span><span data-lat>UKLJUČI NOTIFIKACIJE</span>
        </button>
      )}
      {status.kind === "subscribed" && (
        <>
          <Pill color="var(--success)" sr="✓ НОТИФИКАЦИЈЕ АКТИВНЕ НА ОВОМ УРЕЂАЈУ" lat="✓ NOTIFIKACIJE AKTIVNE NA OVOM UREĐAJU" />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="adm-btn adm-btn-secondary"
              style={{ flex: 1 }}
              disabled={pending}
              onClick={() => start(test)}
            >
              📨 <span data-sr>ТЕСТ</span><span data-lat>TEST</span>
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-secondary"
              style={{ flex: 1 }}
              disabled={pending}
              onClick={() => start(disable)}
            >
              ⏻ <span data-sr>ИСКЉУЧИ</span><span data-lat>ISKLJUČI</span>
            </button>
          </div>
        </>
      )}

      {flash && (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: flash.kind === "ok" ? "var(--success)" : "var(--danger)",
          }}
        >
          <span data-sr>{flash.sr}</span>
          <span data-lat>{flash.lat}</span>
        </div>
      )}
    </div>
  );
}

function Pill({ color, dashed, sr, lat }: { color: string; dashed?: boolean; sr: string; lat: string }) {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color,
        border: `1px ${dashed ? "dashed" : "solid"} ${color === "var(--success)" ? "rgba(120,200,120,.4)" : "rgba(245,233,208,.18)"}`,
        background: color === "var(--success)" ? "rgba(120,200,120,.08)" : "transparent",
        borderRadius: 6,
        padding: "10px 12px",
        lineHeight: 1.5,
      }}
    >
      <span data-sr>{sr}</span><span data-lat>{lat}</span>
    </div>
  );
}

async function refreshStatus(): Promise<Status> {
  if (typeof window === "undefined") return { kind: "loading" };
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { kind: "unsupported" };
  }
  if (Notification.permission === "denied") return { kind: "blocked" };

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) return { kind: "subscribed" };
  } catch {
    // SW not ready yet — treat as needing subscribe
  }

  if (Notification.permission === "granted") return { kind: "needs-subscribe" };
  return { kind: "needs-permission" };
}

/** VAPID public key is sent as base64url; PushManager wants Uint8Array. */
function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
