"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  subscribePwaInstall,
  getPwaInstallSnapshot,
  getPwaInstallServerSnapshot,
  triggerPwaInstall,
} from "@/lib/pwa-install";

const DISMISS_KEY = "trisa-install-dismissed-at";
const DISMISS_TTL_DAYS = 7;

/**
 * Admin-only "install this app" auto-bar. Mounted from
 * src/app/admin/layout.tsx, shared `beforeinstallprompt` state via
 * src/lib/pwa-install.ts so the manual button in /admin/podesavanja → INFO
 * sees the same event.
 *
 *  - Hidden if the app is already installed (standalone display-mode).
 *  - Hidden for 7 days after the user dismisses it.
 *  - Hidden if the browser never fires `beforeinstallprompt` (iOS Safari,
 *    Firefox, etc.) — the manual button on settings handles those.
 */
export function InstallPrompt() {
  const installState = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallSnapshot,
    getPwaInstallServerSnapshot
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (at && Date.now() - at < DISMISS_TTL_DAYS * 86400 * 1000) {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;
  if (installState.installed) return null;
  if (!installState.promptEvent) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function install() {
    await triggerPwaInstall();
  }

  return (
    <div className="adm-install-bar" role="dialog" aria-label="Install Triša app">
      <div className="adm-install-text">
        <div className="adm-install-title" data-sr>ИНСТАЛИРАЈ АПЛИКАЦИЈУ</div>
        <div className="adm-install-title" data-lat>INSTALIRAJ APLIKACIJU</div>
        <div className="adm-install-sub" data-sr>Брже отварање + ради и без интернета.</div>
        <div className="adm-install-sub" data-lat>Brže otvaranje + radi i bez interneta.</div>
      </div>
      <button type="button" className="adm-install-cta" onClick={install}>
        <span data-sr>ДОДАЈ</span>
        <span data-lat>DODAJ</span>
      </button>
      <button type="button" className="adm-install-x" aria-label="Zatvori" onClick={dismiss}>×</button>
    </div>
  );
}
