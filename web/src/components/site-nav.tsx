import Link from "next/link";
import { LangToggle } from "./lang-toggle";

export function SiteNav() {
  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        <div className="nav-logo-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-120.png" alt="Berbernica Triša" />
        </div>
        <div className="nav-logo-text">
          <span data-sr>Берберница</span>
          <span data-lat>Berbernica</span>
          <span>Батајница · EST 2025</span>
        </div>
      </Link>

      <ul className="nav-links">
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
          <Link href="/shop" data-sr>Продавница</Link>
          <Link href="/shop" data-lat>Prodavnica</Link>
        </li>
      </ul>

      <div className="nav-right">
        <LangToggle />
      </div>
    </nav>
  );
}
