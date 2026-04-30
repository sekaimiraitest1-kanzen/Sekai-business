import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { parseSocialLinks } from "@/lib/social-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Политика приватности",
  description:
    "Како Берберница Триша прикупља, обрађује и чува твоје податке. ГДПР усаглашено.",
  alternates: { canonical: "/privatnost" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "30. април 2026.";

export default async function PrivacyPage() {
  const sb = createClient();
  const { data: salon } = await sb
    .from("salons")
    .select("name, address, phone, email, social_links")
    .eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa")
    .single();
  const socialLinks = parseSocialLinks(salon?.social_links);

  return (
    <>
      <SiteNav />
      <main className="legal-page">
        <div className="legal-container">
          <div className="legal-eyebrow">
            <span data-sr>§ ПРАВНО</span>
            <span data-lat>§ PRAVNO</span>
          </div>
          <h1 className="legal-title">
            <span data-sr>Политика приватности</span>
            <span data-lat>Politika privatnosti</span>
          </h1>
          <div className="legal-meta">
            <span data-sr>Последње ажурирање: {LAST_UPDATED}</span>
            <span data-lat>Poslednje ažuriranje: {LAST_UPDATED}</span>
          </div>

          <section className="legal-section" data-sr>
            <h2>1. Ко смо ми</h2>
            <p>
              Овај сајт води Берберница Триша (у даљем тексту „ми"), мушка
              берберница са седиштем на адреси Мајора Зорана Радосављевића
              226б, Батајница, Београд. Контакт: 065 9003 742,{" "}
              <a href="mailto:berbernicatrisa@gmail.com">berbernicatrisa@gmail.com</a>.
            </p>
            <p>
              Подаци регистрације правног субјекта (пун назив, ПИБ, матични
              број) биће упуњени до тренутка лансирања сајта.
            </p>

            <h2>2. Које податке прикупљамо</h2>
            <h3>2.1 Подаци о резервацији термина</h3>
            <ul>
              <li>Име и презиме</li>
              <li>Број телефона</li>
              <li>Имејл адреса (опционо — само ако желиш потврду имејлом)</li>
              <li>Изабрана услуга, датум и време термина</li>
              <li>Напомене које сам уносиш у форму</li>
            </ul>
            <h3>2.2 Подаци о наруџбини из шопа</h3>
            <ul>
              <li>Име и презиме</li>
              <li>Број телефона</li>
              <li>Имејл адреса (опционо)</li>
              <li>Списак производа, количине и укупна цена</li>
              <li>Напомена за преузимање ако је уносиш</li>
            </ul>
            <h3>2.3 Технички подаци (аутоматски)</h3>
            <ul>
              <li>
                Колачић о изабраном писму (ћирилица/латиница) — траје до
                ручног брисања кеша
              </li>
              <li>
                Анонимна аналитика посете (укупан број посета, тип уређаја,
                држава) преко{" "}
                <a href="https://plausible.io/data-policy" target="_blank" rel="noopener noreferrer">
                  Plausible Analytics
                </a>{" "}
                — без колачића за праћење, без личних идентификатора
              </li>
            </ul>

            <h2>3. Зашто прикупљамо ове податке</h2>
            <ul>
              <li>
                <strong>Извршење услуге:</strong> резервације и наруџбине не
                могу да се обраде без основних контакт података
              </li>
              <li>
                <strong>Контакт у случају промене:</strong> ако нешто хитно
                искрсне (нпр. отказивање термина), можемо те обавестити СМС-ом,
                позивом или имејлом
              </li>
              <li>
                <strong>Унапређење сајта:</strong> анонимна статистика нам
                помаже да видимо шта ради, шта не. Ово није личне природе.
              </li>
            </ul>

            <h2>4. Коме шаљемо твоје податке</h2>
            <p>Не продајемо и не делимо податке трећим странама у маркетиншке сврхе. Технички, твоји подаци пролазе кроз:</p>
            <ul>
              <li>
                <strong>Supabase</strong> (Ирска, ЕУ) — складиштење базе и
                интерног комуникационог система
              </li>
              <li>
                <strong>Resend</strong> (САД) — слање имејл потврда. Не стиже
                имејл? Само не уносиш — звекни нас телефоном.
              </li>
              <li>
                <strong>Vercel</strong> (САД/ЕУ) — хостинг сајта. Не види
                садржај резервација.
              </li>
            </ul>
            <p>
              Сви ови провајдери су ГДПР усаглашени и потписали су стандардне
              уговорне клаузуле са нама за пренос ван ЕУ.
            </p>

            <h2>5. Колико чувамо твоје податке</h2>
            <ul>
              <li>
                <strong>Резервације:</strong> 2 године од термина (због
                потенцијалних рекламација и пореских захтева)
              </li>
              <li>
                <strong>Наруџбине из шопа:</strong> 5 година (закон о
                трговини)
              </li>
              <li>
                <strong>Имејл потврде:</strong> 90 дана у Resend архиви
              </li>
              <li>
                <strong>Анонимна аналитика:</strong> бесконачно (не садржи
                личне податке, не може се повезати са тобом)
              </li>
            </ul>

            <h2>6. Твоја права (ГДПР)</h2>
            <p>У свако доба имаш право да:</p>
            <ul>
              <li>добијеш увид у све податке које имамо о теби</li>
              <li>исправиш нетачне податке</li>
              <li>тражиш брисање („право на заборав")</li>
              <li>пренесеш податке на другу услугу (преносивост)</li>
              <li>ограничиш обраду или је одбијеш</li>
              <li>уложиш приговор код Повереника за информације од јавног значаја</li>
            </ul>
            <p>
              Захтев пошаљи на{" "}
              <a href="mailto:berbernicatrisa@gmail.com">berbernicatrisa@gmail.com</a>{" "}
              са насловом „ГДПР — приступ подацима" и бројем телефона који је
              уписан у резервацију. Одговарамо у року од 30 дана.
            </p>

            <h2>7. Колачићи</h2>
            <p>
              Користимо само технички неопходне колачиће — једини је{" "}
              <code>lang</code> који памти твоје писмо (ћир/лат). Не користимо
              колачиће за оглашавање, ретаргетинг или праћење.
            </p>

            <h2>8. Безбедност</h2>
            <p>
              Сви подаци се преносе преко HTTPS везе. Лозинке администратора су
              хеширане (bcrypt). Backup базе се прави сваке ноћи и шифрован
              чува 90 дана.
            </p>

            <h2>9. Измене ове политике</h2>
            <p>
              Када променимо ову политику, ажурираћемо датум на врху странице.
              Битне промене (нови провајдер, нова сврха обраде) објавимо на
              почетној страни 14 дана пре него што ступе на снагу.
            </p>

            <h2>10. Контакт</h2>
            <p>
              За било које питање око ове политике:{" "}
              <a href="mailto:berbernicatrisa@gmail.com">berbernicatrisa@gmail.com</a>{" "}
              или 065 9003 742.
            </p>
          </section>

          <section className="legal-section" data-lat>
            <h2>1. Ko smo mi</h2>
            <p>
              Ovaj sajt vodi Berbernica Triša (u daljem tekstu „mi"), muška
              berbernica sa sedištem na adresi Majora Zorana Radosavljevića
              226b, Batajnica, Beograd. Kontakt: 065 9003 742,{" "}
              <a href="mailto:berbernicatrisa@gmail.com">berbernicatrisa@gmail.com</a>.
            </p>
            <p>
              Podaci registracije pravnog subjekta (pun naziv, PIB, matični
              broj) biće upunjeni do trenutka lansiranja sajta.
            </p>

            <h2>2. Koje podatke prikupljamo</h2>
            <h3>2.1 Podaci o rezervaciji termina</h3>
            <ul>
              <li>Ime i prezime</li>
              <li>Broj telefona</li>
              <li>Imejl adresa (opciono — samo ako želiš potvrdu imejlom)</li>
              <li>Izabrana usluga, datum i vreme termina</li>
              <li>Napomene koje sam unosiš u formu</li>
            </ul>
            <h3>2.2 Podaci o narudžbini iz šopa</h3>
            <ul>
              <li>Ime i prezime</li>
              <li>Broj telefona</li>
              <li>Imejl adresa (opciono)</li>
              <li>Spisak proizvoda, količine i ukupna cena</li>
              <li>Napomena za preuzimanje ako je unosiš</li>
            </ul>
            <h3>2.3 Tehnički podaci (automatski)</h3>
            <ul>
              <li>
                Kolačić o izabranom pismu (ćirilica/latinica) — traje do
                ručnog brisanja keša
              </li>
              <li>
                Anonimna analitika posete (ukupan broj poseta, tip uređaja,
                država) preko{" "}
                <a href="https://plausible.io/data-policy" target="_blank" rel="noopener noreferrer">
                  Plausible Analytics
                </a>{" "}
                — bez kolačića za praćenje, bez ličnih identifikatora
              </li>
            </ul>

            <h2>3. Zašto prikupljamo ove podatke</h2>
            <ul>
              <li>
                <strong>Izvršenje usluge:</strong> rezervacije i narudžbine ne
                mogu da se obrade bez osnovnih kontakt podataka
              </li>
              <li>
                <strong>Kontakt u slučaju promene:</strong> ako nešto hitno
                iskrsne (npr. otkazivanje termina), možemo te obavestiti
                SMS-om, pozivom ili imejlom
              </li>
              <li>
                <strong>Unapređenje sajta:</strong> anonimna statistika nam
                pomaže da vidimo šta radi, šta ne. Ovo nije lične prirode.
              </li>
            </ul>

            <h2>4. Kome šaljemo tvoje podatke</h2>
            <p>Ne prodajemo i ne delimo podatke trećim stranama u marketinške svrhe. Tehnički, tvoji podaci prolaze kroz:</p>
            <ul>
              <li>
                <strong>Supabase</strong> (Irska, EU) — skladištenje baze i
                internog komunikacionog sistema
              </li>
              <li>
                <strong>Resend</strong> (SAD) — slanje imejl potvrda. Ne stiže
                imejl? Samo ne unosiš — zvekni nas telefonom.
              </li>
              <li>
                <strong>Vercel</strong> (SAD/EU) — hosting sajta. Ne vidi
                sadržaj rezervacija.
              </li>
            </ul>
            <p>
              Svi ovi provajderi su GDPR usaglašeni i potpisali su standardne
              ugovorne klauzule sa nama za prenos van EU.
            </p>

            <h2>5. Koliko čuvamo tvoje podatke</h2>
            <ul>
              <li>
                <strong>Rezervacije:</strong> 2 godine od termina (zbog
                potencijalnih reklamacija i poreskih zahteva)
              </li>
              <li>
                <strong>Narudžbine iz šopa:</strong> 5 godina (zakon o
                trgovini)
              </li>
              <li>
                <strong>Imejl potvrde:</strong> 90 dana u Resend arhivi
              </li>
              <li>
                <strong>Anonimna analitika:</strong> beskonačno (ne sadrži
                lične podatke, ne može se povezati sa tobom)
              </li>
            </ul>

            <h2>6. Tvoja prava (GDPR)</h2>
            <p>U svako doba imaš pravo da:</p>
            <ul>
              <li>dobiješ uvid u sve podatke koje imamo o tebi</li>
              <li>ispraviš netačne podatke</li>
              <li>tražiš brisanje („pravo na zaborav")</li>
              <li>preneseš podatke na drugu uslugu (prenosivost)</li>
              <li>ograničiš obradu ili je odbiješ</li>
              <li>uložiš prigovor kod Poverenika za informacije od javnog značaja</li>
            </ul>
            <p>
              Zahtev pošalji na{" "}
              <a href="mailto:berbernicatrisa@gmail.com">berbernicatrisa@gmail.com</a>{" "}
              sa naslovom „GDPR — pristup podacima" i brojem telefona koji je
              upisan u rezervaciju. Odgovaramo u roku od 30 dana.
            </p>

            <h2>7. Kolačići</h2>
            <p>
              Koristimo samo tehnički neophodne kolačiće — jedini je{" "}
              <code>lang</code> koji pamti tvoje pismo (ćir/lat). Ne koristimo
              kolačiće za oglašavanje, retargeting ili praćenje.
            </p>

            <h2>8. Bezbednost</h2>
            <p>
              Svi podaci se prenose preko HTTPS veze. Lozinke administratora su
              heširane (bcrypt). Backup baze se pravi svake noći i šifrovan
              čuva 90 dana.
            </p>

            <h2>9. Izmene ove politike</h2>
            <p>
              Kada promenimo ovu politiku, ažuriraćemo datum na vrhu stranice.
              Bitne promene (novi provajder, nova svrha obrade) objavimo na
              početnoj strani 14 dana pre nego što stupe na snagu.
            </p>

            <h2>10. Kontakt</h2>
            <p>
              Za bilo koje pitanje oko ove politike:{" "}
              <a href="mailto:berbernicatrisa@gmail.com">berbernicatrisa@gmail.com</a>{" "}
              ili 065 9003 742.
            </p>
          </section>

          <div className="legal-footer-nav">
            <Link href="/uslovi-koriscenja" data-sr>Услови коришћења →</Link>
            <Link href="/uslovi-koriscenja" data-lat>Uslovi korišćenja →</Link>
          </div>
        </div>
      </main>
      <SiteFooter
        phone={salon?.phone ?? undefined}
        email={salon?.email ?? undefined}
        address={salon?.address ?? undefined}
        socialLinks={socialLinks}
      />
    </>
  );
}
