"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "vuk-cookie-acked-v1";

/**
 * Minimal "ok-button" cookie notice. We don't need a consent gate because
 * we use ZERO tracking cookies — only a `lang` cookie that's strictly
 * necessary for the bilingual UI to remember the user's choice. EU/SR
 * cookie law allows strictly-necessary cookies without consent; this banner
 * is a courtesy disclosure, not a gate.
 *
 * The notice dismisses on click and stays dismissed via localStorage.
 * Renders nothing on first server pass (avoids hydration flash) and only
 * appears post-mount if the user hasn't acknowledged before.
 */
export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      // localStorage unavailable (private mode, weird browser) — just show
      setShow(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore — banner dismisses anyway */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="cookie-notice" role="region" aria-label="Cookie notice">
      <div className="cookie-notice-text">
        <span data-sr>
          This site only uses strictly necessary cookies (to remember your language).
          No tracking, no ads.{" "}
          <Link href="/privatnost">Learn more →</Link>
        </span>
        <span data-lat>
          Sajt koristi samo tehnički neophodne kolačiće (za pamćenje jezika).
          Bez praćenja, bez oglašavanja.{" "}
          <Link href="/privatnost">Saznaj više →</Link>
        </span>
      </div>
      <button className="cookie-notice-btn" onClick={dismiss} type="button">
        <span data-sr>OK</span>
        <span data-lat>U REDU</span>
      </button>
    </div>
  );
}
