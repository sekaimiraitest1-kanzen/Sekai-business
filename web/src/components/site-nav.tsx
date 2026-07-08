import Link from "next/link";
import { LangToggle } from "./lang-toggle";

export function SiteNav() {
  return (
    <nav className="nav" aria-label="Glavna navigacija">
      <Link href="/" className="nav-logo" aria-label="Barbershop Vuk — početna">
        <div className="nav-logo-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-vuk-wordmark.png" alt="Barbershop Vuk" />
        </div>
        <div className="nav-logo-text">
          <span data-sr>Batajnica · EST 2024</span>
          <span data-lat>Batajnica · EST 2024</span>
        </div>
      </Link>

      <ul className="nav-links">
        <li>
          <a href="/#onama" data-sr>About</a>
          <a href="/#onama" data-lat>O nama</a>
        </li>
        <li>
          <a href="/#usluge" data-sr>Services</a>
          <a href="/#usluge" data-lat>Usluge</a>
        </li>
        <li>
          <a href="/#galerija" data-sr>Gallery</a>
          <a href="/#galerija" data-lat>Galerija</a>
        </li>
        <li>
          <Link href="/blog" data-sr>Blog</Link>
          <Link href="/blog" data-lat>Blog</Link>
        </li>
        <li>
          <Link href="/shop" data-sr>Shop</Link>
          <Link href="/shop" data-lat>Prodavnica</Link>
        </li>
      </ul>

      <div className="nav-right">
        <LangToggle />
      </div>
    </nav>
  );
}
