"use client";

import { useEffect } from "react";

/**
 * Registers the service worker at /sw.js (scope: /).
 * - Production only (avoid stale dev builds + caching SSR HMR responses).
 * - Idempotent: browser handles duplicate registration as a no-op.
 * - No visual output.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Silent — SW registration is a progressive enhancement; failure shouldn't surface to users.
      });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
