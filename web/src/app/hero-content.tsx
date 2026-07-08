import { formatPhoneE164 } from "@/lib/phone";

export function HeroContent({
  address,
  phone,
  eyebrow,
  title,
  subtitle,
}: {
  address: string;
  phone: string;
  eyebrow: { sr: string; lat: string };
  title: { sr: [string, string]; lat: [string, string] };
  subtitle: { sr: string; lat: string };
}) {
  return (
    <div className="hero-v2-content">
      <div className="hero-v2-inner">
        <div className="hero-v2-pill">
          <span className="hero-v2-pill-dot" />
          <span data-sr>{eyebrow.sr}</span>
          <span data-lat>{eyebrow.lat}</span>
        </div>

        <h1 className="hero-v2-title">
          <span data-sr>{title.sr[0]}{title.sr[1] && <><br />{title.sr[1]}</>}</span>
          <span data-lat>{title.lat[0]}{title.lat[1] && <><br />{title.lat[1]}</>}</span>
        </h1>

        <p style={{ margin: "22px 0 0", fontSize: 16, lineHeight: 1.6, color: "#c9c3b8", maxWidth: 420 }}>
          <span data-sr>{subtitle.sr}</span>
          <span data-lat>{subtitle.lat}</span>
        </p>

        <p style={{ margin: "18px 0 0", fontSize: 15, lineHeight: 1.6, color: "#c9c3b8", maxWidth: 400 }}>{address}</p>

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
    </div>
  );
}
