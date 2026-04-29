import Link from "next/link";

export function SiteFooter({ phone, email, address }: { phone?: string; email?: string; address?: string }) {
  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
            <div className="nav-logo-mark">Т</div>
            <div className="nav-logo-text">
              <span data-sr>Берберница Триша</span>
              <span data-lat>Berbernica Triša</span>
              <span>Батајница · EST 2025</span>
            </div>
          </Link>
          <p data-sr>Твоје место за стил, традицију и добру причу. Батајница, Земун.</p>
          <p data-lat>Tvoje mesto za stil, tradiciju i dobru priču. Batajnica, Zemun.</p>
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
            <div className="footer-info-item">{phone ?? "065 9003 742"}</div>
            <div className="footer-info-item">{email ?? "berbernicatrisa@gmail.com"}</div>
            <div className="footer-info-item" data-sr>{address ?? "Пуковника Миленка 12"}</div>
            <div className="footer-info-item" data-lat>{address ?? "Pukovnika Milenka 12"}</div>
            <div className="footer-info-item" data-sr>Батајница, Земун</div>
            <div className="footer-info-item" data-lat>Batajnica, Zemun</div>
          </div>
        </div>

        <div>
          <div className="footer-col-title" data-sr>РАДНО ВРЕМЕ</div>
          <div className="footer-col-title" data-lat>RADNO VREME</div>
          <div className="footer-info">
            <div className="footer-info-item" data-sr>Пон—Пет: 09—20h</div>
            <div className="footer-info-item" data-lat>Pon—Pet: 09—20h</div>
            <div className="footer-info-item" data-sr>Субота: 09—17h</div>
            <div className="footer-info-item" data-lat>Subota: 09—17h</div>
            <div className="footer-info-item" data-sr>Недеља: затворено</div>
            <div className="footer-info-item" data-lat>Nedelja: zatvoreno</div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-copy">© 2026 BERBERNICA TRIŠA · BATAJNICA</div>
        <div className="footer-tagline">— STIL · TRADICIJA · PRIČA —</div>
      </div>
    </footer>
  );
}
