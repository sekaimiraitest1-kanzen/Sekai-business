import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBookingCancelToken } from "@/lib/booking/cancel-token";
import { isPastBelgrade } from "@/lib/datetime";
import { CancelForm } from "./cancel-form";

export const dynamic = "force-dynamic";

/**
 * Public cancel landing page reached from the link in the booking
 * confirmation email. Validates token + booking state on the server before
 * rendering the form, so a stale or tampered link surfaces an explanatory
 * message instead of a generic error.
 */
export default async function CancelBookingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { t?: string };
}) {
  const token = searchParams.t ?? "";
  const bookingId = params.id;
  const valid = verifyBookingCancelToken(bookingId, token);

  const sb = createAdminClient();
  const { data: booking } = await sb
    .from("bookings")
    .select("id, date, time_slot, status, services(name_sr, name_lat, price), customers(name)")
    .eq("id", bookingId)
    .maybeSingle();

  type Svc = { name_sr?: string | null; name_lat?: string | null; price?: number | null };
  type Cust = { name?: string | null };
  const svc = (() => {
    const s = booking?.services as Svc | Svc[] | null | undefined;
    if (!s) return null;
    return Array.isArray(s) ? s[0] ?? null : s;
  })();
  const cust = (() => {
    const c = booking?.customers as Cust | Cust[] | null | undefined;
    if (!c) return null;
    return Array.isArray(c) ? c[0] ?? null : c;
  })();

  // Three failure modes the user might hit. Each shows the same shell with a
  // different reason and a back-to-home link.
  let errorView: { titleSr: string; titleLat: string; bodySr: string; bodyLat: string } | null = null;
  if (!valid) {
    errorView = {
      titleSr: "Link is invalid",
      titleLat: "Link nije ispravan",
      bodySr: "Try opening the link from the confirmation email. If it still doesn't work, call us.",
      bodyLat: "Pokušaj da otvoriš link iz email-a potvrde. Ako i dalje ne radi, pozovi nas.",
    };
  } else if (!booking) {
    errorView = {
      titleSr: "Appointment doesn't exist",
      titleLat: "Termin ne postoji",
      bodySr: "It may already be cancelled, or the link is old.",
      bodyLat: "Možda je već otkazan ili je link star.",
    };
  } else if (booking.status === "cancelled") {
    errorView = {
      titleSr: "Appointment already cancelled",
      titleLat: "Termin je već otkazan",
      bodySr: "See you some other time.",
      bodyLat: "Vidimo se neki drugi put.",
    };
  } else if (booking.status === "done" || booking.status === "no_show") {
    errorView = {
      titleSr: "This appointment can't be cancelled",
      titleLat: "Termin se ne može otkazati",
      bodySr: "This appointment has already happened or was marked as a no-show.",
      bodyLat: "Ovaj termin je već obavljen ili markiran kao neodržan.",
    };
  } else if (booking.date && booking.time_slot && isPastBelgrade(booking.date as string, (booking.time_slot as string).slice(0, 5))) {
    errorView = {
      titleSr: "Appointment has passed",
      titleLat: "Termin je prošao",
      bodySr: "We can't turn back time.",
      bodyLat: "Ne možemo vratiti vreme.",
    };
  }

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--brown-950)", color: "var(--cream)", padding: "48px 24px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22, color: "var(--mustard)" }}>Barbershop Vuk</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.5)", letterSpacing: ".15em", textTransform: "uppercase", marginTop: 6 }}>
            OTKAZIVANJE TERMINA
          </div>
        </div>

        {errorView ? (
          <div style={{ background: "rgba(245,233,208,.05)", padding: 32, borderRadius: 4, textAlign: "center" }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22, marginBottom: 12 }}>
              <span data-sr>{errorView.titleSr}</span>
              <span data-lat>{errorView.titleLat}</span>
            </h1>
            <p style={{ color: "rgba(245,233,208,.7)", lineHeight: 1.6, fontSize: 14 }}>
              <span data-sr>{errorView.bodySr}</span>
              <span data-lat>{errorView.bodyLat}</span>
            </p>
            <Link href="/" style={{ display: "inline-block", marginTop: 24, padding: "10px 24px", background: "var(--mustard)", color: "var(--brown-950)", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
              <span data-sr>BACK TO SITE</span>
              <span data-lat>NAZAD NA SAJT</span>
            </Link>
          </div>
        ) : (
          <CancelForm
            bookingId={bookingId}
            token={token}
            customerName={cust?.name ?? ""}
            serviceName={svc?.name_lat ?? "—"}
            date={(booking?.date as string) ?? ""}
            timeSlot={((booking?.time_slot as string) ?? "").slice(0, 5)}
            price={svc?.price ?? 0}
          />
        )}
      </div>
    </main>
  );
}
