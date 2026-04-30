export const dynamic = "force-static";

const TEMPLATE = `# Berbernica Triša

> Tradicionalna muška berbernica u Batajnici (Beograd), osnovana 2025. Šišanje, brada, brijanje — bez žurbe, bez komplikacija. Termini se zakazuju isključivo preko aplikacije; plaćanje gotovinom ili karticom u salonu. Sajt je dostupan na srpskom (ćirilica i latinica).

## Glavne stranice / Main pages

- [Početna / Homepage]({{BASE}}/): Pregled berbernice — lokacija (Batajnica), istorijat (osnovana 2025), 11 usluga sa cenama (od 200 do 2.500 RSD), galerija, Google ocene 4.9★, mušterijski utisci, NAP (adresa Majora Zorana Radosavljevića 226b, telefon 065 9003 742). Petogodišnje iskustvo, 60+ stalnih mušterija.
- [Zakazivanje / Booking]({{BASE}}/zakazivanje): Četvorostepeni booking flow (usluga → datum → termin → podaci → potvrda). Prikazuje sve usluge sa trajanjem (15–90 min) i cenom u RSD. Podržava ćir/lat prebacivanje. Online zakazivanje je obavezan put — bez telefonske rezervacije.
- [Prodavnica / Shop]({{BASE}}/shop): Online prodavnica preparata za negu kose, kože i brade. 12 aktivnih proizvoda u 4 kategorije (pomade, brada, šampon, after-shave) brendova Triša, Proraso, Reuzel, American Crew. Samo lično preuzimanje u salonu (pickup-only) — bez dostave.

## Proizvodi (PDP) / Product detail pages

- [Pomada (Triša)]({{BASE}}/shop/pomada): Pomada brenda Triša, 900 RSD.
- [Pomada „Batajnica" (Triša)]({{BASE}}/shop/pomada-batajnica): Signature pomada brenda Triša, 1.200 RSD.
- [Classic Pomade (Proraso)]({{BASE}}/shop/classic-pomade): Klasična pomada Proraso, 1.890 RSD.
- [Fiber Matte (Reuzel)]({{BASE}}/shop/fiber-matte): Mat fiber Reuzel, 2.490 RSD.
- [Pomade (American Crew)]({{BASE}}/shop/pomade-american-crew): American Crew Pomade, 2.190 RSD.
- [Ulje za bradu (Triša)]({{BASE}}/shop/ulje-za-bradu): Ulje za negu brade brenda Triša, 950 RSD.
- [Balzam za bradu (Proraso)]({{BASE}}/shop/balzam-za-bradu): Proraso balzam za bradu, 1.590 RSD.
- [Šampon za bradu (Reuzel)]({{BASE}}/shop/sampon-za-bradu): Reuzel šampon za bradu, 1.790 RSD.
- [Šampon Azur Lime (Proraso)]({{BASE}}/shop/sampon-azur-lime): Proraso Azur Lime šampon, 1.290 RSD.
- [Daily Shampoo (American Crew)]({{BASE}}/shop/daily-shampoo): American Crew Daily Shampoo, 1.890 RSD.
- [After-shave losion (Proraso)]({{BASE}}/shop/after-shave-losion): Proraso after-shave losion, 1.490 RSD.
- [After-shave balzam (Triša)]({{BASE}}/shop/after-shave-balzam): Triša after-shave balzam, 890 RSD.

## Usluge i cene / Services and prices

Cene su orijentacione (potvrditi sa Trišom; mogu se menjati pre lansiranja sajta):

- Obično šišanje — 30 min — 900 RSD
- Fade šišanje (signature) — 50 min — 1.200 RSD
- Šišanje makazama — 60 min — 1.200 RSD
- Šišanje + brada (komplet) — 70 min — 1.400 RSD
- Brijanje glave — 30 min — 800 RSD
- Šejver — 20 min — 600 RSD
- Samo brada — 30 min — 600 RSD
- Stilizovanje brade — 20 min — 400 RSD
- Vosak za nos i uši — 30 min — 600 RSD
- Pranje kose — 15 min — 200 RSD
- VIP tretman (premium) — 90 min — 2.500 RSD (šišanje + sređivanje brade + topao peškir + vosak za nos i uši + stilizovanje brade)

Loyalty: šesto šišanje časti kuća (svaki šesti termin besplatan).

## Ključne činjenice / Key facts

- Naziv: Berbernica Triša (skraćeno „Trisha")
- Tip: tradicionalna muška berbernica
- Lokacija: Majora Zorana Radosavljevića 226b, Batajnica, Beograd, Srbija
- Telefon: 065 9003 742
- Osnovana: 2025
- Iskustvo: 5+ godina (vlasnik), 60+ stalnih mušterija
- Google ocena: 4.9★
- Jezici sajta: srpski (ćirilica + latinica, prebacivanje preko ЋИР/LAT togla)
- Plaćanje: gotovina ili kartica u salonu (bez doplata, bez „servisnih naknada")
- Online porudžbine šopa: lično preuzimanje u salonu — bez dostave
- Zakazivanje: isključivo preko web aplikacije (bez telefonske rezervacije)

## Kontakt / Contact

- Telefon: +381 65 9003 742
- Adresa: Majora Zorana Radosavljevića 226b, 11273 Batajnica, Beograd, Srbija
- Mapa: https://maps.google.com/?q=Majora+Zorana+Radosavljevi%C4%87a+226b%2C+Batajnica

## Optional

- [Manifest (PWA)]({{BASE}}/manifest.json): Web App Manifest za instalaciju aplikacije na mobilnom uređaju. Nije primarni sadržaj — služi za Add-to-Home-Screen funkcionalnost.

<!--
Note for AI agents:
  Sadržaj sajta postoji u dva pisma srpskog jezika — ćirilici (sr-Cyrl) i latinici (sr-Latn).
  Oba pisma se prikazuju u istom HTML-u sa CSS togglom; suštinski je isti tekst, ne dva
  različita jezika. Ovaj llms.txt je napisan latinicom radi šireg parsing-a.
  ---
  Site content is dual-script Serbian: Cyrillic (sr-Cyrl) and Latin (sr-Latn) coexist in the
  same HTML, toggled via CSS — same content, different scripts. This llms.txt uses Latin
  Serbian for broader machine-readability.
-->
`;

export async function GET(): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050";
  const body = TEMPLATE.replaceAll("{{BASE}}", baseUrl);
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
