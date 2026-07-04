import { getResend, FROM_EMAIL } from "./client";

export async function sendBookingConfirmation(input: {
  to: string;
  customerName: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  price: number;
  basePrice?: number;
  surchargeApplied?: boolean;
  loyaltyFreeCut?: boolean;
  salonAddress: string;
  bookingId: string;
  cancelUrl?: string;
}) {
  if (!input.to) return;
  const resend = getResend();
  const surcharge = input.surchargeApplied === true;
  const loyalty = input.loyaltyFreeCut === true;
  const basePrice = input.basePrice ?? input.price;
  // Body fragments injected conditionally:
  //  - surcharge banner (only when +30% kicks in)
  //  - base-price line (so customer sees the bump explicitly: "Bila bi X, zbog kasnog otkaza prošli put platićeš X+30%")
  //  - cancel-link CTA (omitted if no token-URL was passed in)
  // Three pricing modes — only one banner shows at a time. Loyalty wins
  // over surcharge in the booking action upstream, so by the time we get
  // here `loyalty=true` already implies `surcharge=false`.
  const loyaltyBanner = loyalty ? `
    <div style="background: rgba(158,27,27,.18); padding: 14px; margin-bottom: 16px; font-size: 13px; color: #3A3A3A; line-height: 1.55; border-left: 3px solid #9E1B1B;">
      🎁 <strong>BESPLATAN TERMIN</strong> — iskoristio si nagradu za 6. dolazak. Cena je 0 RSD. Hvala što biraš nas.
    </div>
  ` : "";
  const surchargeBanner = surcharge ? `
    <div style="background: rgba(204,34,34,.1); padding: 14px; margin-bottom: 16px; font-size: 13px; color: #3A3A3A; line-height: 1.55; border-left: 3px solid #cc2222;">
      ⚠ <strong>Doplata +30%</strong> primenjena na ovaj termin jer je tvoj prethodni termin otkazan manje od 2h pre, ili nisi došao. Naplaćuje se u salonu. Sledeći termin se vraća na redovnu cenu.
    </div>
  ` : "";
  const priceRow = loyalty ? `
    <tr><td style="color: #3A3A3A; padding: 6px 0;">REDOVNA CENA</td><td style="text-align: right; color: #3A3A3A; text-decoration: line-through;">${basePrice} RSD</td></tr>
    <tr><td style="color: #9E1B1B; padding: 6px 0;">CENA</td><td style="text-align: right; font-family: Georgia, serif; font-style: italic; color: #9E1B1B; font-size: 18px;">0 RSD · LOYALTY</td></tr>
  ` : surcharge ? `
    <tr><td style="color: #3A3A3A; padding: 6px 0;">REDOVNA CENA</td><td style="text-align: right; color: #3A3A3A; text-decoration: line-through;">${basePrice} RSD</td></tr>
    <tr><td style="color: #cc2222; padding: 6px 0;">CENA SA DOPLATOM</td><td style="text-align: right; font-family: Georgia, serif; font-style: italic; color: #cc2222; font-size: 18px;">${input.price} RSD</td></tr>
  ` : `
    <tr><td style="color: #3A3A3A; padding: 6px 0;">CENA</td><td style="text-align: right; font-family: Georgia, serif; font-style: italic; color: #9E1B1B; font-size: 18px;">${input.price} RSD</td></tr>
  `;
  const cancelBlock = input.cancelUrl ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${input.cancelUrl}" style="display: inline-block; padding: 10px 20px; background: transparent; border: 1px solid rgba(92,58,34,.3); color: #3A3A3A; text-decoration: none; font-size: 12px; letter-spacing: .04em;">Otkaži termin</a>
      <div style="font-size: 10px; color: #3A3A3A; opacity: 0.6; margin-top: 6px;">Do 2 sata pre — bez doplate. Posle 2 sata — sledeći termin +30%.</div>
    </div>
  ` : "";
  await resend.emails.send({
    from: `Barbershop Vuk <${FROM_EMAIL}>`,
    to: input.to,
    subject: `Potvrda rezervacije — ${input.date} u ${input.timeSlot}${loyalty ? " (LOYALTY GRATIS)" : surcharge ? " (+30%)" : ""}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; color: #0A0A0A; background: #FAF3E3; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://sekai-business.vercel.app/logo-120.png" alt="Barbershop Vuk" width="64" height="64" style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; border: 0;" />
          <div style="font-family: Georgia, serif; font-size: 18px; font-style: italic; color: #3A3A3A; margin-top: 8px;">Barbershop Vuk · Batajnica</div>
        </div>

        <h1 style="font-family: Georgia, serif; font-style: italic; font-size: 28px; color: #0A0A0A; text-align: center; margin: 24px 0;">Vidimo se, ${input.customerName}.</h1>
        <p style="text-align: center; color: #3A3A3A; line-height: 1.6;">Tvoja rezervacija je potvrđena.</p>

        ${loyaltyBanner}
        ${surchargeBanner}

        <div style="background: #F5E9D0; padding: 24px; margin: 24px 0;">
          <table style="width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 13px;">
            <tr><td style="color: #3A3A3A; padding: 6px 0;">USLUGA</td><td style="text-align: right; color: #0A0A0A;">${input.serviceName}</td></tr>
            <tr><td style="color: #3A3A3A; padding: 6px 0;">DATUM</td><td style="text-align: right; color: #0A0A0A;">${input.date}</td></tr>
            <tr><td style="color: #3A3A3A; padding: 6px 0;">VREME</td><td style="text-align: right; color: #0A0A0A;">${input.timeSlot}</td></tr>
            ${priceRow}
            <tr><td style="color: #3A3A3A; padding: 6px 0;">ADRESA</td><td style="text-align: right; color: #0A0A0A;">${input.salonAddress}</td></tr>
            <tr><td style="color: #3A3A3A; padding: 6px 0;">ID</td><td style="text-align: right; color: #0A0A0A;">${input.bookingId.slice(0, 8).toUpperCase()}</td></tr>
          </table>
        </div>

        ${cancelBlock}

        <div style="background: rgba(158,27,27,.1); padding: 16px; font-size: 12px; color: #3A3A3A; line-height: 1.6;">
          ⚠ Otkazivanje je slobodno do 2 sata pre termina. Kasnije otkazivanje povlači +30% doplate na sledeći termin.
        </div>

        <p style="text-align: center; color: #3A3A3A; font-size: 12px; margin-top: 24px;">
          Vidimo se uskoro.<br>
          — Vuk
        </p>
      </div>
    `,
  });
}

/**
 * Owner-side email fired when a new haircut booking lands. Mirrors the
 * push-notification payload so Vuk gets the same info on lock-screen
 * and in the inbox. Source = "WEB" for public booking, "WALK-IN" for
 * staff-created in admin.
 */
export async function sendOwnerNewBookingEmail(input: {
  to: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  price: number;
  source: "WEB" | "WALK-IN";
}) {
  if (!input.to) return;
  const resend = getResend();
  await resend.emails.send({
    from: `Barbershop Vuk <${FROM_EMAIL}>`,
    to: input.to,
    subject: `Nov termin · ${input.date} ${input.timeSlot} · ${input.customerName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; color: #0A0A0A; background: #FAF3E3; padding: 24px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <img src="https://sekai-business.vercel.app/logo-120.png" alt="Barbershop Vuk" width="48" height="48" style="display: inline-block; width: 48px; height: 48px; border-radius: 50%; border: 0;" />
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #3A3A3A; letter-spacing: .15em; text-transform: uppercase; margin-bottom: 8px;">${input.source === "WEB" ? "novi termin · sajt" : "novi termin · walk-in"}</div>
        <h1 style="font-family: Georgia, serif; font-style: italic; font-size: 22px; margin: 0 0 16px 0;">${input.customerName}</h1>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
          <tr><td style="padding: 4px 0; color: #3A3A3A;">Telefon</td><td style="text-align: right;"><a href="tel:${input.customerPhone}" style="color: #9E1B1B; text-decoration: none;">${input.customerPhone}</a></td></tr>
          <tr><td style="padding: 4px 0; color: #3A3A3A;">Usluga</td><td style="text-align: right; color: #0A0A0A;">${input.serviceName}</td></tr>
          <tr><td style="padding: 4px 0; color: #3A3A3A;">Datum</td><td style="text-align: right; color: #0A0A0A;">${input.date}</td></tr>
          <tr><td style="padding: 4px 0; color: #3A3A3A;">Vreme</td><td style="text-align: right; font-family: Georgia, serif; font-style: italic; color: #9E1B1B; font-size: 18px;">${input.timeSlot}</td></tr>
          <tr><td style="padding: 4px 0; color: #3A3A3A;">Cena</td><td style="text-align: right; color: #0A0A0A;">${input.price} RSD</td></tr>
        </table>
        <p style="font-size: 11px; color: #3A3A3A; opacity: .65; line-height: 1.5; margin: 0;">
          Stigao je i u admin panel. Push notifikaciju primaš direktno u aplikaciji ako si je uključio.
        </p>
      </div>
    `,
  });
}

export async function sendOrderEmail(input: {
  to: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  pickupNote: string | null;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  orderId: string;
}) {
  if (!input.to) return;
  const resend = getResend();
  const itemsHtml = input.items
    .map(
      (it) => `<tr>
        <td style="padding: 6px 0; color: #0A0A0A;">${it.quantity} × ${it.name}</td>
        <td style="text-align: right; color: #9E1B1B;">${it.quantity * it.price} RSD</td>
      </tr>`
    )
    .join("");

  await resend.emails.send({
    from: `Barbershop Vuk Shop <${FROM_EMAIL}>`,
    to: input.to,
    subject: `Nova porudžbina — ${input.customerName} · ${input.total} RSD`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; color: #0A0A0A; background: #FAF3E3; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <img src="https://sekai-business.vercel.app/logo-120.png" alt="Barbershop Vuk" width="48" height="48" style="display: inline-block; width: 48px; height: 48px; border-radius: 50%; border: 0;" />
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .15em; color: #9E1B1B; margin-top: 8px;">▸ NOVA PORUDŽBINA</div>
        </div>

        <h2 style="font-family: Georgia, serif; font-style: italic; font-size: 24px; text-align: center; margin: 16px 0;">${input.customerName}</h2>
        <p style="text-align: center; color: #3A3A3A; font-family: 'JetBrains Mono', monospace;">📞 <a href="tel:${input.customerPhone}" style="color: #9E1B1B; text-decoration: none;">${input.customerPhone}</a></p>
        ${input.customerEmail ? `<p style="text-align: center; color: #3A3A3A; font-family: 'JetBrains Mono', monospace; font-size: 12px;">✉ ${input.customerEmail}</p>` : ""}

        <div style="background: #F5E9D0; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 13px;">
            ${itemsHtml}
            <tr><td colspan="2" style="border-top: 1px solid rgba(92,58,34,.2); padding-top: 12px;"></td></tr>
            <tr>
              <td style="font-family: Inter, sans-serif; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #0A0A0A;">UKUPNO</td>
              <td style="text-align: right; font-family: Georgia, serif; font-style: italic; font-size: 22px; color: #9E1B1B;">${input.total} RSD</td>
            </tr>
          </table>
        </div>

        ${input.pickupNote ? `<div style="background: rgba(158,27,27,.1); padding: 14px; font-size: 13px; color: #3A3A3A;"><strong>Napomena:</strong> ${input.pickupNote}</div>` : ""}

        <p style="text-align: center; font-size: 11px; color: #3A3A3A; margin-top: 24px; opacity: 0.6;">Order ID: ${input.orderId.slice(0, 8).toUpperCase()}</p>
      </div>
    `,
  });
}

/**
 * Customer-facing order receipt — sent immediately after a successful
 * checkout when the buyer left an email. `sendOrderEmail` (above) goes to
 * Vuk; this one closes the loop with the customer so they have proof of
 * the order, not just a "thanks" screen they might lose by closing the tab.
 * No-op if customer didn't provide email.
 */
export async function sendOrderConfirmationToCustomer(input: {
  to: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal?: number;
  total: number;
  loyaltyDiscount?: boolean;
  orderId: string;
  salonAddress: string;
  salonPhone: string;
}) {
  if (!input.to) return;
  const resend = getResend();
  const loyaltyDiscount = input.loyaltyDiscount === true;
  const subtotal = input.subtotal ?? input.total;
  const itemsHtml = input.items
    .map(
      (it) => `<tr>
        <td style="padding: 6px 0; color: #0A0A0A;">${it.quantity} × ${it.name}</td>
        <td style="text-align: right; color: #9E1B1B;">${it.quantity * it.price} RSD</td>
      </tr>`
    )
    .join("");

  // When loyalty discount applies the totals row becomes two-line
  // (subtotal struck through, final highlighted) plus an explicit banner
  // above the items. Otherwise it's the existing single-line summary.
  const loyaltyBanner = loyaltyDiscount ? `
    <div style="background: rgba(158,27,27,.18); padding: 14px; margin: 16px 0; font-size: 13px; color: #3A3A3A; line-height: 1.55; border-left: 3px solid #9E1B1B;">
      🎁 <strong>−20% LOYALTY POPUST</strong> — iskoristio si nagradu za 6. dolazak. Hvala što biraš nas.
    </div>
  ` : "";
  const totalRows = loyaltyDiscount ? `
    <tr><td colspan="2" style="border-top: 1px solid rgba(92,58,34,.2); padding-top: 12px;"></td></tr>
    <tr><td style="color: #3A3A3A; padding: 4px 0;">SUBTOTAL</td><td style="text-align: right; color: #3A3A3A; text-decoration: line-through;">${subtotal} RSD</td></tr>
    <tr><td style="color: #9E1B1B; padding: 4px 0; font-weight: 600;">UKUPNO (−20%)</td><td style="text-align: right; font-family: Georgia, serif; font-style: italic; font-size: 22px; color: #9E1B1B;">${input.total} RSD</td></tr>
  ` : `
    <tr><td colspan="2" style="border-top: 1px solid rgba(92,58,34,.2); padding-top: 12px;"></td></tr>
    <tr>
      <td style="font-family: Inter, sans-serif; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #0A0A0A;">UKUPNO</td>
      <td style="text-align: right; font-family: Georgia, serif; font-style: italic; font-size: 22px; color: #9E1B1B;">${input.total} RSD</td>
    </tr>
  `;

  await resend.emails.send({
    from: `Barbershop Vuk Shop <${FROM_EMAIL}>`,
    to: input.to,
    subject: `Potvrda porudžbine — ${input.total} RSD${loyaltyDiscount ? " (−20% LOYALTY)" : ""}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; color: #0A0A0A; background: #FAF3E3; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://sekai-business.vercel.app/logo-120.png" alt="Barbershop Vuk" width="64" height="64" style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; border: 0;" />
          <div style="font-family: Georgia, serif; font-size: 18px; font-style: italic; color: #3A3A3A; margin-top: 8px;">Barbershop Vuk · Batajnica</div>
        </div>

        <h1 style="font-family: Georgia, serif; font-style: italic; font-size: 28px; color: #0A0A0A; text-align: center; margin: 24px 0;">Hvala, ${input.customerName}.</h1>
        <p style="text-align: center; color: #3A3A3A; line-height: 1.6;">Tvoja porudžbina je primljena. Javićemo ti čim bude spremna za preuzimanje.</p>

        ${loyaltyBanner}

        <div style="background: #F5E9D0; padding: 24px; margin: 24px 0;">
          <table style="width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 13px;">
            ${itemsHtml}
            ${totalRows}
            <tr><td style="color: #3A3A3A; padding: 6px 0;">PLAĆANJE</td><td style="text-align: right; color: #0A0A0A;">Gotovina ili kartica u salonu</td></tr>
            <tr><td style="color: #3A3A3A; padding: 6px 0;">ADRESA</td><td style="text-align: right; color: #0A0A0A;">${input.salonAddress}</td></tr>
            <tr><td style="color: #3A3A3A; padding: 6px 0;">TELEFON</td><td style="text-align: right; color: #0A0A0A;"><a href="tel:${input.salonPhone}" style="color: #0A0A0A; text-decoration: none;">${input.salonPhone}</a></td></tr>
          </table>
        </div>

        <div style="background: rgba(158,27,27,.1); padding: 16px; font-size: 12px; color: #3A3A3A; line-height: 1.6;">
          Plaćanje je u salonu kad dođeš da pokupiš. Ako se predomisliš, javi se na telefon iznad.
        </div>

        <p style="text-align: center; color: #3A3A3A; font-size: 12px; margin-top: 24px;">
          Vidimo se.<br>
          — Vuk
        </p>

        <p style="text-align: center; font-size: 11px; color: #3A3A3A; margin-top: 24px; opacity: 0.6;">Order ID: ${input.orderId.slice(0, 8).toUpperCase()}</p>
      </div>
    `,
  });
}

/**
 * G2 — Sent when admin marks an order `ready` in /admin/shop/porudzbine.
 * Customer can come pick up. No-op if customer didn't leave an email.
 */
export async function sendOrderReadyEmail(input: {
  to: string;
  customerName: string;
  total: number;
  orderId: string;
  salonAddress: string;
  salonPhone: string;
}) {
  if (!input.to) return;
  const resend = getResend();
  await resend.emails.send({
    from: `Barbershop Vuk Shop <${FROM_EMAIL}>`,
    to: input.to,
    subject: `Tvoja porudžbina je spremna za preuzimanje — ${input.total} RSD`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; color: #0A0A0A; background: #FAF3E3; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <img src="https://sekai-business.vercel.app/logo-120.png" alt="Barbershop Vuk" width="64" height="64" style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; border: 0;" />
          <div style="font-family: Georgia, serif; font-size: 18px; font-style: italic; color: #3A3A3A; margin-top: 8px;">Barbershop Vuk · Batajnica</div>
        </div>

        <h1 style="font-family: Georgia, serif; font-style: italic; font-size: 28px; color: #0A0A0A; text-align: center; margin: 24px 0;">Spremna za pickup, ${input.customerName}.</h1>
        <p style="text-align: center; color: #3A3A3A; line-height: 1.6;">Dođi u salon kad ti odgovara — proizvodi te čekaju na pultu.</p>

        <div style="background: #F5E9D0; padding: 24px; margin: 24px 0;">
          <table style="width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 13px;">
            <tr><td style="color: #3A3A3A; padding: 6px 0;">UKUPNO</td><td style="text-align: right; font-family: Georgia, serif; font-style: italic; color: #9E1B1B; font-size: 18px;">${input.total} RSD</td></tr>
            <tr><td style="color: #3A3A3A; padding: 6px 0;">PLAĆANJE</td><td style="text-align: right; color: #0A0A0A;">Gotovina ili kartica u salonu</td></tr>
            <tr><td style="color: #3A3A3A; padding: 6px 0;">ADRESA</td><td style="text-align: right; color: #0A0A0A;">${input.salonAddress}</td></tr>
            <tr><td style="color: #3A3A3A; padding: 6px 0;">TELEFON</td><td style="text-align: right; color: #0A0A0A;"><a href="tel:${input.salonPhone}" style="color: #0A0A0A; text-decoration: none;">${input.salonPhone}</a></td></tr>
          </table>
        </div>

        <p style="text-align: center; color: #3A3A3A; font-size: 12px; margin-top: 24px;">
          Vidimo se.<br>
          — Vuk
        </p>

        <p style="text-align: center; font-size: 11px; color: #3A3A3A; margin-top: 24px; opacity: 0.6;">Order ID: ${input.orderId.slice(0, 8).toUpperCase()}</p>
      </div>
    `,
  });
}
