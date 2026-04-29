"use client";

import { useEffect, useState } from "react";

// Chromium beforeinstallprompt event — not in TS lib.dom yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "trisa-install-dismissed-at";
const DISMISS_TTL_DAYS = 7;

/**
 * Admin-only "install this app" prompt. Renders nothing on the public site by
 * design — it's only mounted from src/app/admin/layout.tsx.
 *
 * Behavior:
 *  - Listens for the Chromium `beforeinstallprompt` event. If it never fires
 *    (already installed, unsupported browser, iOS Safari) the prompt stays hidden.
 *  - Honors a 7-day localStorage dismissal so the bar doesn't pester admins.
 *  - On accept: triggers the native browser install dialog and clears state.
 */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed → don't bother.
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;

    // Recently dismissed → respect that.
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_DAYS * 86400 * 1000) return;

    function handler(e: Event) {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !evt) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!evt) return;
    try {
      await evt.prompt();
      await evt.userChoice;
    } finally {
      setVisible(false);
      setEvt(null);
    }
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
