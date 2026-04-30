"use client";

import { useEffect } from "react";
import { logClientError } from "@/lib/error-log";

/**
 * Global error boundary — fires when the root layout itself crashes.
 * Cannot import the brand stylesheet (legacy.css depends on the very layout
 * that just blew up), so it ships an inline-styled fallback that still
 * carries the Triša voice. Last-resort surface; almost never seen in practice.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("[global-error.tsx]", error);
    void logClientError({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      surface: "global",
    });
  }, [error]);

  return (
    <html lang="sr-Latn">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#1A0F05",
          color: "#F5E9D0",
          fontFamily: "Inter, -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "#C84A3F",
            marginBottom: 24,
            fontFamily: "'JetBrains Mono', monospace, ui-monospace",
          }}
        >
          § 500 · CRITICAL ERROR
        </div>
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: "clamp(36px, 8vw, 64px)",
            fontWeight: 700,
            margin: "0 0 16px",
            lineHeight: 1.1,
          }}
        >
          Sajt je trenutno nedostupan.
        </h1>
        <p style={{ color: "rgba(245,233,208,.6)", maxWidth: 480, lineHeight: 1.6, marginBottom: 24 }}>
          Ako se ovo nastavi, pozovi nas direktno. Triša radi kao i obično.
        </p>
        <a
          href="tel:+381659003742"
          style={{
            background: "#D4A53A",
            color: "#1A0F05",
            padding: "14px 28px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          📞 065 9003 742
        </a>
        {error.digest && (
          <p style={{ fontSize: 10, color: "rgba(245,233,208,.25)", marginTop: 24, fontFamily: "monospace" }}>
            ref: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
