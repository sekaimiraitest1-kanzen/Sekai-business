"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent, EVENTS } from "@/lib/plausible";

// NOTE: internal state keys "sr"/"lat" are legacy names from the Cyrillic/Latin
// toggle this fork replaced. "lat" = Serbian (default); "sr" now holds English
// content. Kept the old key names to avoid renaming every data-sr/data-lat
// attribute across the codebase.
const LANG_LABEL: Record<"sr" | "lat", string> = {
  lat: "Srpski",
  sr: "English",
};

export function LangToggle() {
  const [lang, setLang] = useState<"sr" | "lat">("lat");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // sync from <html data-lang> on mount (set by server from cookie)
  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-lang") ?? "lat") as "sr" | "lat";
    setLang(current);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  function set(next: "sr" | "lat") {
    setOpen(false);
    if (next === lang) return; // no-op + no spam tracking
    setLang(next);
    document.documentElement.setAttribute("data-lang", next);
    document.documentElement.setAttribute("lang", next === "sr" ? "en" : "sr-Latn");
    document.cookie = `lang=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
    trackEvent(EVENTS.LANG_TOGGLED, { script: next });
  }

  return (
    <div className="lang-toggle" ref={rootRef}>
      <button
        type="button"
        className="lang-btn lang-btn-current"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {LANG_LABEL[lang]}
        <span className="lang-btn-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="lang-menu" role="listbox">
          {(["lat", "sr"] as const).map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={lang === code}
                className={`lang-menu-item ${lang === code ? "active" : ""}`}
                onClick={() => set(code)}
              >
                {LANG_LABEL[code]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
