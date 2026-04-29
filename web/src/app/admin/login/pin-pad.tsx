"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockAdmin } from "@/lib/auth/admin-actions";

export function LoginPad() {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [lockUntil, setLockUntil] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  // hardware keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lockUntil) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") backspace();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, lockUntil]);

  function press(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(null);
    if (next.length === 4) submit(next);
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
    setError(null);
  }

  function clearAll() {
    setPin("");
    setError(null);
  }

  function submit(value: string) {
    start(async () => {
      const res = await unlockAdmin(value);
      if (res.ok) {
        router.replace("/admin/termini");
        router.refresh();
      } else if (res.error === "LOCKED_OUT") {
        setLockUntil(res.lockoutUntil ?? null);
        setError("ZAKLJUČANO · 10 MIN");
        setPin("");
      } else if (res.error === "NO_ADMIN") {
        setError("ADMIN NIJE KONFIGURISAN");
        setPin("");
      } else {
        const r = res.remaining;
        setError(r != null ? `POGREŠAN PIN · OSTALO ${r}` : "POGREŠAN PIN");
        setPin("");
      }
    });
  }

  const lockMsRemaining = lockUntil ? new Date(lockUntil).getTime() - Date.now() : 0;

  return (
    <div className="login-screen">
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontStyle: "italic", color: "rgba(245,233,208,.3)", letterSpacing: ".06em", marginBottom: 24 }}>
        — STIL · TRADICIJA · PRIČA —
      </div>
      <div
        style={{
          width: 56,
          height: 56,
          background: "var(--mustard)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Playfair Display', serif",
          fontSize: 28,
          fontWeight: 900,
          fontStyle: "italic",
          color: "var(--brown-950)",
          marginBottom: 16,
        }}
      >
        Т
      </div>
      <div
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".15em",
          textTransform: "uppercase",
          color: "rgba(245,233,208,.3)",
          marginBottom: 4,
        }}
      >
        ADMIN
      </div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, fontStyle: "italic", color: "var(--cream)", marginBottom: 4 }}>
        <span data-sr>Здраво, Тришо.</span>
        <span data-lat>Zdravo, Trišo.</span>
      </h1>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(245,233,208,.35)", textTransform: "uppercase", letterSpacing: ".1em" }}>
        <span data-sr>Унеси PIN да наставиш.</span>
        <span data-lat>Unesi PIN da nastaviš.</span>
      </p>

      <div className="pin-display">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`pin-dot ${i < pin.length ? "filled" : ""}`} />
        ))}
      </div>

      <div className="pin-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            type="button"
            className="pin-btn"
            disabled={pending || pin.length >= 4 || !!lockUntil && lockMsRemaining > 0}
            onClick={() => press(String(d))}
          >
            {d}
          </button>
        ))}
        <button type="button" className="pin-btn special" onClick={clearAll}>
          <span data-sr>ОЧИСТИ</span>
          <span data-lat>OČISTI</span>
        </button>
        <button
          type="button"
          className="pin-btn"
          disabled={pending || pin.length >= 4 || !!lockUntil && lockMsRemaining > 0}
          onClick={() => press("0")}
        >
          0
        </button>
        <button type="button" className="pin-btn special" onClick={backspace}>
          ←
        </button>
      </div>

      <div className="pin-error">{error ?? ""}</div>

      <div style={{ marginTop: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.15)", letterSpacing: ".08em" }}>
        DEMO · UNESI 1234
      </div>
    </div>
  );
}
