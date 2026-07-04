import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();

  const { data: salon } = await supabase
    .from("salons")
    .select("name, address, phone")
    .eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa")
    .single();

  const { data: services } = await supabase
    .from("services")
    .select("name_sr, name_lat, price, duration_min")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  return (
    <main className="min-h-screen bg-paper">
      {/* Temporary bootstrap landing — to be replaced by full hero per design/prototypes/index.html */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-24 bg-brown-950 text-cream">
        <p className="font-mono text-xs tracking-wide-18 uppercase text-mustard mb-6">
          <span data-sr>Бутик берберница · Батајница</span>
          <span data-lat>Barbershop Vuk · Batajnica</span>
        </p>

        <h1 className="font-display italic font-bold text-center text-cream text-5xl md:text-7xl leading-tight max-w-4xl">
          <span data-sr>{salon?.name ?? "Барбершоп Вук"}</span>
          <span data-lat>Barbershop Vuk</span>
        </h1>

        <p className="font-body text-center text-cream/70 mt-6 max-w-xl">
          <span data-sr>
            Bootstrap у току. Дизајн ће бити имплементиран према{" "}
            <code className="font-mono text-mustard">design/prototypes/index.html</code>.
          </span>
          <span data-lat>
            Bootstrap u toku. Dizajn će biti implementiran prema{" "}
            <code className="font-mono text-mustard">design/prototypes/index.html</code>.
          </span>
        </p>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <Stat label="Salon" value={salon?.name ? "✓" : "—"} sub="DB" />
          <Stat label="Usluga" value={services?.length ?? 0} sub="active" />
          <Stat label="Adresa" value={salon?.address ? "✓" : "—"} sub="seed" />
          <Stat label="Telefon" value={salon?.phone ? "✓" : "—"} sub="seed" />
        </div>

        {services && services.length > 0 && (
          <ul className="mt-16 w-full max-w-2xl divide-y divide-cream/10">
            {services.map((s, i) => (
              <li key={i} className="flex justify-between items-baseline py-4">
                <span className="font-display italic text-2xl text-cream">
                  <span data-sr>{s.name_sr}</span>
                  <span data-lat>{s.name_lat}</span>
                </span>
                <span className="font-display italic text-2xl text-mustard">
                  {s.price.toLocaleString("sr-RS")} <span className="text-base">RSD</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-16 font-mono text-xs tracking-wide-12 text-cream/40 uppercase">
          localhost:3050 · Next.js bootstrap
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div>
      <div className="font-display italic font-bold text-mustard text-4xl">{value}</div>
      <div className="font-heading uppercase text-xs tracking-wide-08 text-cream/60 mt-1">{label}</div>
      <div className="font-mono text-[10px] uppercase text-cream/30">{sub}</div>
    </div>
  );
}
