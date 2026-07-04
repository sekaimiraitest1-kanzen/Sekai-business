import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { parseSocialLinks } from "@/lib/social-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Услови коришћења",
  description:
    "Pravila rezervacije termina, korišćenja šopa i ponašanja na sajtu Barbershop Vuk.",
  alternates: { canonical: "/uslovi-koriscenja" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "30. април 2026.";

export default async function TermsPage() {
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
      <main className="legal-page" id="main-content">
        <div className="legal-container">
          <div className="legal-eyebrow">
            <span data-sr>§ ПРАВНО</span>
            <span data-lat>§ PRAVNO</span>
          </div>
          <h1 className="legal-title">
            <span data-sr>Услови коришћења</span>
            <span data-lat>Uslovi korišćenja</span>
          </h1>
          <div className="legal-meta">
            <span data-sr>Последње ажурирање: {LAST_UPDATED}</span>
            <span data-lat>Poslednje ažuriranje: {LAST_UPDATED}</span>
          </div>

          <section className="legal-section" data-sr>
            <h2>1. Општи услови</h2>
            <p>
              Korišćenjem sajta Barbershop Vuk prihvataš ove uslove. Ako se ne
              слажеш са било којом тачком, немој користити сајт за резервацију
              или наручивање.
            </p>
            <p>
              Сајт води BARBERSHOP VUK, Мајора Зорана Радосављевића 138,
              Батајница, Београд. ПИБ [ПОПУНИТИ], матични број [ПОПУНИТИ],
              основана 2024. године.
            </p>

            <h2>2. Резервација термина</h2>
            <h3>2.1 Како се резервише</h3>
            <p>
              Резервација иде искључиво преко форме на{" "}
              <Link href="/zakazivanje">/zakazivanje</Link>. Не примамо
              резервације телефоном — да би сви имали поштен ред у кораку.
              Ако не успеш да упишеш термин, позови нас и видећемо.
            </p>
            <h3>2.2 Потврда</h3>
            <p>
              Резервација је потврђена чим сачуваш форму. Ако си унео имејл,
              стиже потврда са детаљима. Ако није стигла у року од 5 минута,
              јави се на 060 1424576 — могуће је да није прошло.
            </p>
            <h3>2.3 Отказивање и промена</h3>
            <p>
              <strong>Слободно отказивање до 2 сата пре термина.</strong>{" "}
              Касније отказивање или непојављивање („no-show") нам прави
              трошак јер слот остаје празан, па наплаћујемо <strong>30%</strong>{" "}
              цене услуге као пенал — на следећој посети.
            </p>
            <p>
              Промена термина (исти дан другачије време, или други дан) — јави
              се телефоном чим знаш. Ако је више од 2 сата пре, слободно
              мењамо.
            </p>
            <h3>2.4 Кашњење</h3>
            <p>
              Ако касниш до 10 минута, чекамо те. Ако касниш више, можемо да
              скратимо услугу или предложимо нови термин — зависи од колоне у
              том тренутку.
            </p>

            <h2>3. Шоп — наручивање и преузимање</h2>
            <h3>3.1 Само лично преузимање</h3>
            <p>
              <strong>Не шаљемо поштом, не достављамо.</strong> Сви производи
              се преузимају лично у салону, на адреси изнад.
            </p>
            <h3>3.2 Резервација производа</h3>
            <p>
              Када завршиш наруџбину, резервишемо ти производе на пулту. Ако
              не дођеш у року од <strong>5 радних дана</strong>, наруџбина се
              отказује и производи се враћају у залихе. Ако ти треба више
              времена, само нам јави.
            </p>
            <h3>3.3 Плаћање</h3>
            <p>
              Плаћаш у салону — готовином или картицом. Без сервисних накнада,
              без накнаде за картицу. Цена коју видиш на сајту је цена коју
              плаћаш.
            </p>
            <h3>3.4 Замена и враћање</h3>
            <p>
              Производ можеш да замениш у року од 7 дана од преузимања, ако је
              неотворен и у оригиналном паковању. Враћање новца — само ако
              производ има фабрички недостатак.
            </p>

            <h2>4. Лојалти програм</h2>
            <p>
              Свако шесто шишање је бесплатно — кућа части. Програм се води
              аутоматски кроз твој број телефона, не треба ти картица.
            </p>
            <p>
              Лојалти бодови важе само за услуге шишања (не за бријање, не за
              шоп). Не могу да се пренесу на другу особу или конвертују у
              готовину.
            </p>

            <h2>5. Цене и порез</h2>
            <p>
              Све цене на сајту су у динарима, са урачунатим ПДВ-ом. Цене могу
              да се мењају — оне на сајту у моменту резервације су оне које
              важе за твој термин.
            </p>

            <h2>6. Понашање у салону</h2>
            <p>
              Очекујемо нормално понашање. Алкохолом или дрогом под утицајем
              нећемо радити, незаказана агресија води до трајне забране
              резервације.
            </p>

            <h2>7. Власништво садржаја сајта</h2>
            <p>
              Текст, фотографије, лого и дизајн на сајту су власништво
              Barbershop Vuk. Preuzimanje i ponovna upotreba bez pismene
              сагласности није дозвољена.
            </p>
            <p>
              Имена брендова производа у шопу (Reuzel, Proraso, American Crew,
              итд.) су власништво њихових власника и користе се само за
              идентификацију.
            </p>

            <h2>8. Одрицање одговорности</h2>
            <p>
              Сајт се пружа „какав јесте". Чинимо разумне напоре да све ради,
              али не гарантујемо непрекинут рад. Ако је сајт недоступан, термине
              можеш да закажеш телефоном на 060 1424576.
            </p>

            <h2>9. Решавање спорова</h2>
            <p>
              Прво — позови нас. Скоро све се решава у разговору. Ако није, по
              правилима Закона о заштити потрошача важи надлежност месног суда
              у Београду.
            </p>

            <h2>10. Измене услова</h2>
            <p>
              Услове можемо да мењамо. Битне промене (отказивање, цене,
              лојалти) се објављују 14 дана пре него што ступе на снагу.
              Резервације направљене пре измена иду по старим условима.
            </p>

            <h2>11. Контакт</h2>
            <p>
              За питања, рекламације или било шта правно:{" "}
              <a href="mailto:sekaimiraitest1@gmail.com">sekaimiraitest1@gmail.com</a>{" "}
              или 060 1424576.
            </p>
          </section>

          <section className="legal-section" data-lat>
            <h2>1. Opšti uslovi</h2>
            <p>
              Korišćenjem sajta Barbershop Vuk prihvataš ove uslove. Ako se ne
              slažeš sa bilo kojom tačkom, nemoj koristiti sajt za rezervaciju
              ili naručivanje.
            </p>
            <p>
              Sajt vodi BARBERSHOP VUK, Majora Zorana Radosavljevića 138,
              Batajnica, Beograd. PIB [POPUNITI], matični broj [POPUNITI],
              osnovana 2024. godine.
            </p>

            <h2>2. Rezervacija termina</h2>
            <h3>2.1 Kako se rezerviše</h3>
            <p>
              Rezervacija ide isključivo preko forme na{" "}
              <Link href="/zakazivanje">/zakazivanje</Link>. Ne primamo
              rezervacije telefonom — da bi svi imali pošten red u koraku.
              Ako ne uspeš da upišeš termin, pozovi nas i videćemo.
            </p>
            <h3>2.2 Potvrda</h3>
            <p>
              Rezervacija je potvrđena čim sačuvaš formu. Ako si uneo imejl,
              stiže potvrda sa detaljima. Ako nije stigla u roku od 5 minuta,
              javi se na 060 1424576 — moguće je da nije prošlo.
            </p>
            <h3>2.3 Otkazivanje i promena</h3>
            <p>
              <strong>Slobodno otkazivanje do 2 sata pre termina.</strong>{" "}
              Kasnije otkazivanje ili nepojavljivanje („no-show") nam pravi
              trošak jer slot ostaje prazan, pa naplaćujemo <strong>30%</strong>{" "}
              cene usluge kao penal — na sledećoj poseti.
            </p>
            <p>
              Promena termina (isti dan drugačije vreme, ili drugi dan) — javi
              se telefonom čim znaš. Ako je više od 2 sata pre, slobodno
              menjamo.
            </p>
            <h3>2.4 Kašnjenje</h3>
            <p>
              Ako kasniš do 10 minuta, čekamo te. Ako kasniš više, možemo da
              skratimo uslugu ili predložimo novi termin — zavisi od kolone u
              tom trenutku.
            </p>

            <h2>3. Šop — naručivanje i preuzimanje</h2>
            <h3>3.1 Samo lično preuzimanje</h3>
            <p>
              <strong>Ne šaljemo poštom, ne dostavljamo.</strong> Svi proizvodi
              se preuzimaju lično u salonu, na adresi iznad.
            </p>
            <h3>3.2 Rezervacija proizvoda</h3>
            <p>
              Kada završiš narudžbinu, rezervišemo ti proizvode na pultu. Ako
              ne dođeš u roku od <strong>5 radnih dana</strong>, narudžbina se
              otkazuje i proizvodi se vraćaju u zalihe. Ako ti treba više
              vremena, samo nam javi.
            </p>
            <h3>3.3 Plaćanje</h3>
            <p>
              Plaćaš u salonu — gotovinom ili karticom. Bez servisnih naknada,
              bez naknade za karticu. Cena koju vidiš na sajtu je cena koju
              plaćaš.
            </p>
            <h3>3.4 Zamena i vraćanje</h3>
            <p>
              Proizvod možeš da zameniš u roku od 7 dana od preuzimanja, ako je
              neotvoren i u originalnom pakovanju. Vraćanje novca — samo ako
              proizvod ima fabrički nedostatak.
            </p>

            <h2>4. Lojalti program</h2>
            <p>
              Svako šesto šišanje je besplatno — kuća časti. Program se vodi
              automatski kroz tvoj broj telefona, ne treba ti kartica.
            </p>
            <p>
              Lojalti bodovi važe samo za usluge šišanja (ne za brijanje, ne za
              šop). Ne mogu da se prenesu na drugu osobu ili konvertuju u
              gotovinu.
            </p>

            <h2>5. Cene i porez</h2>
            <p>
              Sve cene na sajtu su u dinarima, sa uračunatim PDV-om. Cene mogu
              da se menjaju — one na sajtu u momentu rezervacije su one koje
              važe za tvoj termin.
            </p>

            <h2>6. Ponašanje u salonu</h2>
            <p>
              Očekujemo normalno ponašanje. Alkoholom ili drogom pod uticajem
              nećemo raditi, nezakazana agresija vodi do trajne zabrane
              rezervacije.
            </p>

            <h2>7. Vlasništvo sadržaja sajta</h2>
            <p>
              Tekst, fotografije, logo i dizajn na sajtu su vlasništvo
              Barbershop Vuk. Preuzimanje i ponovna upotreba bez pismene
              saglasnosti nije dozvoljena.
            </p>
            <p>
              Imena brendova proizvoda u šopu (Reuzel, Proraso, American Crew,
              itd.) su vlasništvo njihovih vlasnika i koriste se samo za
              identifikaciju.
            </p>

            <h2>8. Odricanje odgovornosti</h2>
            <p>
              Sajt se pruža „kakav jeste". Činimo razumne napore da sve radi,
              ali ne garantujemo neprekinut rad. Ako je sajt nedostupan, termine
              možeš da zakažeš telefonom na 060 1424576.
            </p>

            <h2>9. Rešavanje sporova</h2>
            <p>
              Prvo — pozovi nas. Skoro sve se rešava u razgovoru. Ako nije, po
              pravilima Zakona o zaštiti potrošača važi nadležnost mesnog suda
              u Beogradu.
            </p>

            <h2>10. Izmene uslova</h2>
            <p>
              Uslove možemo da menjamo. Bitne promene (otkazivanje, cene,
              lojalti) se objavljuju 14 dana pre nego što stupe na snagu.
              Rezervacije napravljene pre izmena idu po starim uslovima.
            </p>

            <h2>11. Kontakt</h2>
            <p>
              Za pitanja, reklamacije ili bilo šta pravno:{" "}
              <a href="mailto:sekaimiraitest1@gmail.com">sekaimiraitest1@gmail.com</a>{" "}
              ili 060 1424576.
            </p>
          </section>

          <div className="legal-footer-nav">
            <Link href="/privatnost" data-sr>← Политика приватности</Link>
            <Link href="/privatnost" data-lat>← Politika privatnosti</Link>
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
