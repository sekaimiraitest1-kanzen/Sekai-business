import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Страна није пронађена",
  description: "Тражена страна не постоји или је уклоњена.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
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
          color: "var(--mustard)",
          opacity: 0.7,
        }}
      >
        § 404 · ERROR
      </div>
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: "italic",
          fontSize: "clamp(48px, 10vw, 96px)",
          fontWeight: 700,
          margin: 0,
          color: "var(--cream)",
          lineHeight: 1.05,
        }}
      >
        <span data-sr>Овде нема ничега.</span>
        <span data-lat>Ovde nema ničega.</span>
      </h1>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          color: "rgba(245,233,208,.6)",
          maxWidth: 480,
          lineHeight: 1.6,
        }}
      >
        <span data-sr>
          Линк који си пратио је покварен или се страна померила. Иди натраг
          или закажи термин — увек си добродошао код нас.
        </span>
        <span data-lat>
          Link koji si pratio je pokvaren ili se strana pomerila. Idi nazad
          ili zakaži termin — uvek si dobrodošao kod nas.
        </span>
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 13,
            letterSpacing: ".15em",
            textTransform: "uppercase",
            background: "var(--mustard)",
            color: "var(--brown-950)",
            padding: "14px 28px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          <span data-sr>← НА ПОЧЕТНУ</span>
          <span data-lat>← NA POČETNU</span>
        </Link>
        <Link
          href="/zakazivanje"
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
          <span data-sr>ЗАКАЖИ ТЕРМИН →</span>
          <span data-lat>ZAKAŽI TERMIN →</span>
        </Link>
      </div>
    </main>
  );
}
