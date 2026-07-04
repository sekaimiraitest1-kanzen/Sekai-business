export const dynamic = "force-static";

const TEMPLATE = `# Barbershop Vuk

> Muška berbernica u Batajnici (Beograd), osnovana 2024. Šišanje, brada, brijanje — bez žurbe, bez komplikacija. Termini se zakazuju isključivo preko aplikacije; plaćanje gotovinom ili karticom u salonu. Sajt je dostupan na srpskom (ćirilica i latinica).

## Glavne stranice / Main pages

- [Početna / Homepage]({{BASE}}/): Pregled berbernice — lokacija (Batajnica), usluge sa cenama, galerija, mušterijski utisci, NAP (adresa Majora Zorana Radosavljevića 138, telefon 060 1424576).
- [Zakazivanje / Booking]({{BASE}}/zakazivanje): Četvorostepeni booking flow (usluga → datum → termin → podaci → potvrda). Prikazuje sve usluge sa trajanjem i cenom u RSD. Podržava ćir/lat prebacivanje. Online zakazivanje je obavezan put — bez telefonske rezervacije.

## Usluge i cene / Services and prices

- Fade — 45 min — 1.500 RSD
- Oblikovanje duge kose — 45 min — 1.500 RSD
- Klasično šišanje — 30 min — 1.200 RSD
- Mašinica klasično — 20 min — 1.000 RSD
- Brijanje glave — 20 min — 800 RSD
- Oblikovanje brade — 20 min — 900 RSD
- Skraćivanje/skidanje brade — 10 min — 400 RSD
- Šišanje + brada (komplet) — 60 min — 2.000 RSD
- Mašinica klasično + brada (komplet) — 40 min — 1.700 RSD

Pranje i stilizovanje kose uključeno u cenu.

## Ključne činjenice / Key facts

- Naziv: Barbershop Vuk
- Tip: muška berbernica
- Lokacija: Majora Zorana Radosavljevića 138, Beograd 11273, Srbija
- Telefon: 060 1424576
- Osnovana: 2024
- Radno vreme: pon–pet 10–20h, sub 10–17h, ned zatvoreno
- Jezici sajta: srpski (ćirilica + latinica, prebacivanje preko ЋИР/LAT togla)
- Plaćanje: gotovina ili kartica u salonu (bez doplata, bez „servisnih naknada")
- Zakazivanje: isključivo preko web aplikacije (bez telefonske rezervacije)

## Kontakt / Contact

- Telefon: +381 60 1424576
- Adresa: Majora Zorana Radosavljevića 138, Beograd 11273, Srbija

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
