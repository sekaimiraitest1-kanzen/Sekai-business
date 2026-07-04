"use client";

import Link from "next/link";
import { useEffect } from "react";
import { logClientError } from "@/lib/error-log";

/**
 * Per-route error boundary. Caught from anywhere inside the app router.
 * Renders the same brand-consistent shell as `not-found` so a runtime crash
 * doesn't drop the user into Vercel's default white error screen. Captures
 * the error to Supabase `error_log` so admin can triage post-hoc.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[error.tsx]", error);
    void logClientError({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      surface: "client",
    });
  }, [error]);

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "48px 24px",
        background: "var(--brown-950)",
        color: "var(--cream)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "var(--danger, #C84A3F)",
          opacity: 0.8,
        }}
      >
        § 500 · ERROR
      </div>
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: "italic",
          fontSize: "clamp(40px, 8vw, 72px)",
          fontWeight: 700,
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        <span data-sr>Something broke.</span>
        <span data-lat>Nešto je puklo.</span>
      </h1>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          color: "rgba(245,233,208,.6)",
          maxWidth: 520,
          lineHeight: 1.6,
        }}
      >
        <span data-sr>
          The server had a problem. Try again in a minute, or call us if it keeps happening.
        </span>
        <span data-lat>
          Server je imao problem. Pokušaj ponovo za minut, ili nas pozovi ako se nastavi.
        </span>
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 13,
            letterSpacing: ".15em",
            textTransform: "uppercase",
            background: "var(--mustard)",
            color: "var(--brown-950)",
            padding: "14px 28px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <span data-sr>↻ TRY AGAIN</span>
          <span data-lat>↻ POKUŠAJ PONOVO</span>
        </button>
        <Link
          href="/"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 13,
            letterSpacing: ".15em",
            textTransform: "uppercase",
            border: "1px solid rgba(212,165,58,.4)",
            color: "var(--mustard)",
            padding: "14px 28px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          <span data-sr>← BACK HOME</span>
          <span data-lat>← NA POČETNU</span>
        </Link>
        <a
          href="tel:+381601424576"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 13,
            letterSpacing: ".15em",
            textTransform: "uppercase",
            border: "1px solid rgba(212,165,58,.4)",
            color: "var(--mustard)",
            padding: "14px 28px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          📞 060 1424576
        </a>
      </div>
      {error.digest && (
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "rgba(245,233,208,.25)",
            marginTop: 16,
          }}
        >
          ref: {error.digest}
        </p>
      )}
    </main>
  );
}
