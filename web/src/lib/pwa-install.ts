"use client";

// Module-level singleton that captures the Chromium `beforeinstallprompt`
// event once and shares it with every UI surface that wants to offer install.
// Two consumers right now:
//   - <InstallPrompt /> (auto-bar shown on admin layout)
//   - INFO tab on /admin/podesavanja (manual "Preuzmi aplikaciju" button)
// Both must read the *same* event because `beforeinstallprompt` fires once
// per page load — whichever component listens first would otherwise consume
// it.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaInstallState = {
  /** Native install dialog is available right now. */
  promptEvent: BeforeInstallPromptEvent | null;
  /** App is already running in standalone mode (installed). */
  installed: boolean;
};

let state: PwaInstallState = { promptEvent: null, installed: false };
let attached = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function attach() {
  if (attached || typeof window === "undefined") return;
  attached = true;

  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  state = { ...state, installed: standalone };

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state = { ...state, promptEvent: e as BeforeInstallPromptEvent };
    notify();
  });

  window.addEventListener("appinstalled", () => {
    state = { promptEvent: null, installed: true };
    notify();
  });
}

export function subscribePwaInstall(cb: () => void): () => void {
  attach();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getPwaInstallSnapshot(): PwaInstallState {
  return state;
}

/** SSR-safe initial snapshot for `useSyncExternalStore`. */
export function getPwaInstallServerSnapshot(): PwaInstallState {
  return { promptEvent: null, installed: false };
}

export async function triggerPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const evt = state.promptEvent;
  if (!evt) return "unavailable";
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    // Event is one-shot — clear regardless of outcome. On accept the
    // `appinstalled` listener will additionally flip `installed` to true.
    state = { ...state, promptEvent: null };
    notify();
    return choice.outcome;
  } catch {
    state = { ...state, promptEvent: null };
    notify();
    return "unavailable";
  }
}

export function isIosWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  // Exclude Chrome/Firefox/Edge wrappers on iOS — they share WebKit but the
  // "Add to Home Screen" instruction copy assumes Safari's share menu.
  const isSafari = /AppleWebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}
