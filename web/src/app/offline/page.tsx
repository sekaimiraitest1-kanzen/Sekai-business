import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Без везе · Берберница Триша",
  description: "Нема интернет везе. Покушај поново када се повежеш.",
};

// Static, no DB calls — must render purely from the SW pre-cache when offline.
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--paper, #FAF3E3)",
        color: "var(--brown-950, #1A0F05)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: "var(--mustard, #D4A53A)",
          color: "var(--brown-950, #1A0F05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: 40,
          marginBottom: 28,
        }}
      >
        T
      </div>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: "clamp(28px, 6vw, 36px)",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
        }}
      >
        <span data-sr>Без везе</span>
        <span data-lat>Bez veze</span>
      </h1>

      <p
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 15,
          lineHeight: 1.6,
          color: "rgba(26, 15, 5, 0.7)",
          maxWidth: 320,
          margin: "0 0 28px",
        }}
      >
        <span data-sr>Тренутно нема интернета. Покушај поново када се повежеш.</span>
        <span data-lat>Trenutno nema interneta. Pokušaj ponovo kada se povežeš.</span>
      </p>

      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "14px 28px",
          background: "var(--brown-950, #1A0F05)",
          color: "var(--paper, #FAF3E3)",
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          textDecoration: "none",
          borderRadius: 0,
        }}
      >
        <span data-sr>Покушај поново</span>
        <span data-lat>Pokušaj ponovo</span>
      </Link>

      <p
        style={{
          marginTop: 40,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(26, 15, 5, 0.4)",
        }}
      >
        <span data-sr>Берберница Триша · Батајница</span>
        <span data-lat>Berbernica Triša · Batajnica</span>
      </p>
    </main>
  );
}
