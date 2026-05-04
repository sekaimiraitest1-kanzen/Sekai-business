"use client";

import { useState, useSyncExternalStore } from "react";
import {
  subscribePwaInstall,
  getPwaInstallSnapshot,
  getPwaInstallServerSnapshot,
  triggerPwaInstall,
  isIosWebKit,
} from "@/lib/pwa-install";

/**
 * Manual "Preuzmi aplikaciju" card for the INFO tab on /admin/podesavanja.
 * Three runtime states:
 *   1. Already installed → green confirmation pill.
 *   2. Native install event captured → call-to-action button.
 *   3. iOS Safari (no programmatic install) → inline Add-to-Home-Screen
 *      instructions.
 *   4. Anywhere else (Firefox / dismissed / not yet eligible) → tells the
 *      user to come back after using the site for a bit, since Chromium
 *      only fires `beforeinstallprompt` once it considers the PWA installable.
 */
export function InstallAppCard() {
  const installState = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallSnapshot,
    getPwaInstallServerSnapshot
  );
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "info"; sr: string; lat: string } | null>(null);

  async function onInstall() {
    setBusy(true);
    setFlash(null);
    const outcome = await triggerPwaInstall();
    setBusy(false);
    if (outcome === "accepted") {
      setFlash({ kind: "ok", sr: "✓ ИНСТАЛИРАНО", lat: "✓ INSTALIRANO" });
    } else if (outcome === "dismissed") {
      setFlash({ kind: "info", sr: "Инсталација одбачена.", lat: "Instalacija odbačena." });
    } else {
      setFlash({ kind: "info", sr: "Инсталација тренутно није доступна.", lat: "Instalacija trenutno nije dostupna." });
    }
  }

  return (
    <div className="adm-card" style={{ flexDirection: "column", alignItems: "stretch", marginTop: 12, gap: 10 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--mustard)", letterSpacing: ".1em", textTransform: "uppercase" }}>
        📲 <span data-sr>АПЛИКАЦИЈА</span><span data-lat>APLIKACIJA</span>
      </div>

      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(245,233,208,.7)", lineHeight: 1.5 }}>
        <span data-sr>
          Инсталирај админ-апликацију на телефон. Брже отварање, ради и без интернета, отвара се преко иконе на почетном екрану.
        </span>
        <span data-lat>
          Instaliraj admin-aplikaciju na telefon. Brže otvaranje, radi i bez interneta, otvara se preko ikone na početnom ekranu.
        </span>
      </div>

      {installState.installed ? (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: "var(--success)",
            border: "1px solid rgba(120,200,120,.4)",
            borderRadius: 6,
            padding: "10px 12px",
            background: "rgba(120,200,120,.08)",
          }}
        >
          <span data-sr>✓ АПЛИКАЦИЈА ЈЕ ВЕЋ ИНСТАЛИРАНА</span>
          <span data-lat>✓ APLIKACIJA JE VEĆ INSTALIRANA</span>
        </div>
      ) : installState.promptEvent ? (
        <button
          type="button"
          className="adm-btn adm-btn-block"
          onClick={onInstall}
          disabled={busy}
        >
          ⬇ <span data-sr>ПРЕУЗМИ АПЛИКАЦИЈУ</span><span data-lat>PREUZMI APLIKACIJU</span>
        </button>
      ) : isIosWebKit() ? (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "rgba(245,233,208,.85)",
            border: "1px dashed rgba(245,233,208,.18)",
            borderRadius: 6,
            padding: "10px 12px",
            lineHeight: 1.6,
          }}
        >
          <div data-sr>
            На iPhone-у: тапни <strong>Дели</strong> (□↑) у Safari-ју, па <strong>Додај на почетни екран</strong>.
          </div>
          <div data-lat>
            Na iPhone-u: tapni <strong>Deli</strong> (□↑) u Safari-ju, pa <strong>Dodaj na početni ekran</strong>.
          </div>
        </div>
      ) : (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "rgba(245,233,208,.6)",
            border: "1px dashed rgba(245,233,208,.18)",
            borderRadius: 6,
            padding: "10px 12px",
            lineHeight: 1.6,
          }}
        >
          <div data-sr>
            Прегледач још нема понуду за инсталацију. Користи сајт неколико минута, освежи страницу и врати се.
          </div>
          <div data-lat>
            Pregledač još nema ponudu za instalaciju. Koristi sajt nekoliko minuta, osveži stranicu i vrati se.
          </div>
        </div>
      )}

      {flash && (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: flash.kind === "ok" ? "var(--success)" : "rgba(245,233,208,.7)",
          }}
        >
          <span data-sr>{flash.sr}</span>
          <span data-lat>{flash.lat}</span>
        </div>
      )}
    </div>
  );
}
