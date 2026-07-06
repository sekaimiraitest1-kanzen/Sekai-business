"use client";

import { useState } from "react";
import { formatPhoneE164 } from "@/lib/phone";

const SLIDES: { sr: string; lat: string }[] = [
  { sr: "We'll keep you looking sharp", lat: "Zadržaćemo tvoj besprekoran izgled" },
  { sr: "Where a haircut turns into a story", lat: "Mesto gde se rez pretvara u priču" },
  { sr: "Haircut, beard, and a good story", lat: "Šišanje, brada i dobra priča" },
];

export function HeroCarousel({ address, phone }: { address: string; phone: string }) {
  const [slide, setSlide] = useState(0);
  const n = SLIDES.length;

  return (
    <div className="hero-v2-content">
      <div className="hero-v2-inner" key={slide}>
        <div className="hero-v2-pill">
          <span className="hero-v2-pill-dot" />
          <span data-sr>MEN&apos;S BARBERSHOP · BATAJNICA, BELGRADE</span>
          <span data-lat>MUŠKA BERBERNICA · BATAJNICA, BEOGRAD</span>
        </div>

        <h1 className="hero-v2-title">
          <span data-sr>{SLIDES[slide].sr}</span>
          <span data-lat>{SLIDES[slide].lat}</span>
        </h1>

        <p style={{ margin: "30px 0 0", fontSize: 15, lineHeight: 1.6, color: "#c9c3b8", maxWidth: 400 }}>{address}</p>

        <div className="hero-v2-phone-row">
          <span className="hero-v2-phone-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CE1B24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
          </span>
          <a href={`tel:${formatPhoneE164(phone)}`} className="hero-v2-phone-num" style={{ color: "inherit", textDecoration: "none" }}>
            {phone}
          </a>
        </div>

        <div className="hero-cta-row">
          <a href="/zakazivanje" className="btn-primary" style={{ fontSize: 15, padding: "18px 30px" }}>
            <span data-sr>BOOK NOW</span><span data-lat>ZAKAŽI TERMIN</span> →
          </a>
          <a href="#usluge" className="btn-ghost" style={{ padding: "18px 30px" }}>
            <span data-sr>SERVICES</span><span data-lat>USLUGE</span>
          </a>
        </div>
      </div>

      <button
        type="button"
        className="hero-v2-arrow-btn prev"
        aria-label="Previous headline"
        onClick={() => setSlide((s) => (s - 1 + n) % n)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
      </button>
      <button
        type="button"
        className="hero-v2-arrow-btn next"
        aria-label="Next headline"
        onClick={() => setSlide((s) => (s + 1) % n)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
      </button>
    </div>
  );
}
