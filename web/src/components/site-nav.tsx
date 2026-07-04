import Link from "next/link";
import { LangToggle } from "./lang-toggle";

export function SiteNav() {
  return (
    <nav className="nav" aria-label="Glavna navigacija">
      <Link href="/" className="nav-logo" aria-label="Barbershop Vuk — početna">
        <div className="nav-logo-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-120.png" alt="" width={120} height={120} />
        </div>
        <div className="nav-logo-text">
          <span data-sr>Барбершоп Вук</span>
          <span data-lat>Barbershop Vuk</span>
          <span data-sr>Батајница · EST 2024</span>
          <span data-lat>Batajnica · EST 2024</span>
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
