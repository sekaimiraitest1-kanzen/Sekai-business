"use client";

import { useEffect, useState } from "react";

export function LangToggle() {
  const [lang, setLang] = useState<"sr" | "lat">("sr");

  // sync from <html data-lang> on mount (set by server from cookie)
  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-lang") ?? "sr") as "sr" | "lat";
    setLang(current);
  }, []);

  function set(next: "sr" | "lat") {
    setLang(next);
    document.documentElement.setAttribute("data-lang", next);
    document.documentElement.setAttribute("lang", next === "sr" ? "sr-Cyrl" : "sr-Latn");
    document.cookie = `lang=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
  }

  return (
    <div className="lang-toggle">
      <button
        type="button"
        className={`lang-btn ${lang === "sr" ? "active" : ""}`}
        onClick={() => set("sr")}
      >
        ЋИР
      </button>
      <button
        type="button"
        className={`lang-btn ${lang === "lat" ? "active" : ""}`}
        onClick={() => set("lat")}
      >
        LAT
      </button>
    </div>
  );
}
