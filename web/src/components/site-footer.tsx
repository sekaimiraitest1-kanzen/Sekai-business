import Link from "next/link";
import { formatPhoneE164 } from "@/lib/phone";
import { SocialLinksRow } from "@/components/social-links-row";
import { EMPTY_SOCIAL_LINKS, type SocialLinks } from "@/lib/social-links";

type WorkingHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string } | null> | null;

export function SiteFooter({
  phone,
  email,
  address,
  workingHours,
  socialLinks,
}: {
  phone?: string;
  email?: string;
  address?: string;
  workingHours?: WorkingHours;
  socialLinks?: SocialLinks;
}) {
  // Compress working hours into 3 footer rows: weekday range, Saturday, Sunday.
  const wh = workingHours ?? null;
  const weekdayHours = wh?.mon && wh?.fri ? `${wh.mon.open.slice(0, 5)}—${wh.fri.close.slice(0, 5)}` : null;
  const satHours = wh?.sat ? `${wh.sat.open.slice(0, 5)}—${wh.sat.close.slice(0, 5)}` : null;
  const sunOpen = !!wh?.sun;
  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
            <div className="nav-logo-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-120.png" alt="Barbershop Vuk" width={120} height={120} />
            </div>
            <div className="nav-logo-text">
              <span data-sr>Барбершоп Вук</span>
              <span data-lat>Barbershop Vuk</span>
              <span>Батајница · EST 2024</span>
            </div>
          </Link>
          <p data-sr>Твоје место за стил, традицију и добру причу. Батајница.</p>
          <p data-lat>Tvoje mesto za stil, tradiciju i dobru priču. Batajnica.</p>
        </div>

        <div>
          <div className="footer-col-title" data-sr>НАВИГАЦИЈА</div>
          <div className="footer-col-title" data-lat>NAVIGACIJA</div>
          <ul className="footer-links">
            <li>
              <a href="/#onama" data-sr>О нама</a>
              <a href="/#onama" data-lat>O nama</a>
            </li>
            <li>
              <a href="/#usluge" data-sr>Услуге</a>
              <a href="/#usluge" data-lat>Usluge</a>
            </li>
            <li>
              <a href="/#galerija" data-sr>Галерија</a>
              <a href="/#galerija" data-lat>Galerija</a>
            </li>
            <li>
              <a href="/#utisci" data-sr>Утисци</a>
              <a href="/#utisci" data-lat>Utisci</a>
            </li>
            <li>
              <Link href="/zakazivanje" data-sr>Заказивање</Link>
              <Link href="/zakazivanje" data-lat>Zakazivanje</Link>
            </li>
            <li>
              <Link href="/shop" data-sr>Продавница</Link>
              <Link href="/shop" data-lat>Prodavnica</Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="footer-col-title" data-sr>КОНТАКТ</div>
          <div className="footer-col-title" data-lat>KONTAKT</div>
          <div className="footer-info">
            <div className="footer-info-item">
              <a
                href={`tel:${formatPhoneE164(phone ?? "060 1424576")}`}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {phone ?? "060 1424576"}
              </a>
            </div>
            <div className="footer-info-item">{email ?? "sekaimiraitest1@gmail.com"}</div>
            <div className="footer-info-item">{address ?? "Majora Zorana Radosavljevića 138, Beograd"}</div>
          </div>
        </div>

        <div>
          <div className="footer-col-title" data-sr>РАДНО ВРЕМЕ</div>
          <div className="footer-col-title" data-lat>RADNO VREME</div>
          <div className="footer-info">
            <div className="footer-info-item" data-sr>Пон—Пет: {weekdayHours ?? "10:00—20:00"}</div>
            <div className="footer-info-item" data-lat>Pon—Pet: {weekdayHours ?? "10:00—20:00"}</div>
            <div className="footer-info-item" data-sr>Субота: {satHours ?? "10:00—17:00"}</div>
            <div className="footer-info-item" data-lat>Subota: {satHours ?? "10:00—17:00"}</div>
            <div className="footer-info-item" data-sr>Недеља: {sunOpen ? `${wh?.sun?.open.slice(0, 5)}—${wh?.sun?.close.slice(0, 5)}` : "затворено"}</div>
            <div className="footer-info-item" data-lat>Nedelja: {sunOpen ? `${wh?.sun?.open.slice(0, 5)}—${wh?.sun?.close.slice(0, 5)}` : "zatvoreno"}</div>
          </div>
        </div>
      </div>

      <SocialLinksRow links={socialLinks ?? EMPTY_SOCIAL_LINKS} />

      <div className="footer-legal">
        <Link href="/privatnost" data-sr>Политика приватности</Link>
        <Link href="/privatnost" data-lat>Politika privatnosti</Link>
        <span className="footer-legal-sep">·</span>
        <Link href="/uslovi-koriscenja" data-sr>Услови коришћења</Link>
        <Link href="/uslovi-koriscenja" data-lat>Uslovi korišćenja</Link>
      </div>

      <div className="footer-bottom">
        <div className="footer-copy">© 2026 BARBERSHOP VUK · BATAJNICA</div>
        <div className="footer-tagline">— STIL · TRADICIJA · PRIČA —</div>
      </div>

      <div className="footer-imprint">
        <span>BARBERSHOP VUK</span>
        <span className="footer-imprint-sep">·</span>
        <span>PIB [POPUNITI]</span>
        <span className="footer-imprint-sep">·</span>
        <span>МБ [POPUNITI]</span>
        <span className="footer-imprint-sep">·</span>
        <span>{address ?? "Majora Zorana Radosavljevića 138, Beograd"}</span>
      </div>
    </footer>
  );
}
