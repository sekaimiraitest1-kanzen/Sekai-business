import { getResend, FROM_EMAIL } from "./client";

export async function sendBookingConfirmation(input: {
  to: string;
  customerName: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  price: number;
  salonAddress: string;
  bookingId: string;
}) {
  if (!input.to) return; // skip if customer didn't provide email
  const resend = getResend();
  await resend.emails.send({
    from: `Berbernica Trisa <${FROM_EMAIL}>`,
    to: input.to,
    subject: `Potvrda rezervacije — ${input.date} u ${input.timeSlot}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; color: #1A0F05; background: #FAF3E3; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 56px; height: 56px; background: #D4A53A; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-family: Georgia, serif; font-size: 28px; font-weight: 900; font-style: italic; color: #1A0F05;">Т</div>
          <div style="font-family: Georgia, serif; font-size: 18px; font-style: italic; color: #5C3A22; margin-top: 8px;">Berbernica Triša · Batajnica</div>
        </div>

        <h1 style="font-family: Georgia, serif; font-style: italic; font-size: 28px; color: #1A0F05; text-align: center; margin: 24px 0;">Vidimo se, ${input.customerName}.</h1>
        <p style="text-align: center; color: #5C3A22; line-height: 1.6;">Tvoja rezervacija je potvrđena.</p>

        <div style="background: #F5E9D0; padding: 24px; margin: 24px 0;">
          <table style="width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 13px;">
            <tr><td style="color: #5C3A22; padding: 6px 0;">USLUGA</td><td style="text-align: right; color: #1A0F05;">${input.serviceName}</td></tr>
            <tr><td style="color: #5C3A22; padding: 6px 0;">DATUM</td><td style="text-align: right; color: #1A0F05;">${input.date}</td></tr>
            <tr><td style="color: #5C3A22; padding: 6px 0;">VREME</td><td style="text-align: right; color: #1A0F05;">${input.timeSlot}</td></tr>
            <tr><td style="color: #5C3A22; padding: 6px 0;">CENA</td><td style="text-align: right; font-family: Georgia, serif; font-style: italic; color: #D4A53A; font-size: 18px;">${input.price} RSD</td></tr>
            <tr><td style="color: #5C3A22; padding: 6px 0;">ADRESA</td><td style="text-align: right; color: #1A0F05;">${input.salonAddress}</td></tr>
            <tr><td style="color: #5C3A22; padding: 6px 0;">ID</td><td style="text-align: right; color: #1A0F05;">${input.bookingId.slice(0, 8).toUpperCase()}</td></tr>
          </table>
        </div>

        <div style="background: rgba(212,165,58,.1); padding: 16px; font-size: 12px; color: #5C3A22; line-height: 1.6;">
          ⚠ Otkazivanje je slobodno do 2 sata pre termina. Kasnije otkazivanje nosi penal od 30% cene usluge.
        </div>

        <p style="text-align: center; color: #5C3A22; font-size: 12px; margin-top: 24px;">
          Vidimo se uskoro.<br>
          — Triša
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
        <td style="padding: 6px 0; color: #1A0F05;">${it.quantity} × ${it.name}</td>
        <td style="text-align: right; color: #D4A53A;">${it.quantity * it.price} RSD</td>
      </tr>`
    )
    .join("");

  await resend.emails.send({
    from: `Berbernica Trisa Shop <${FROM_EMAIL}>`,
    to: input.to,
    subject: `Nova porudžbina — ${input.customerName} · ${input.total} RSD`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; color: #1A0F05; background: #FAF3E3; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .15em; color: #D4A53A;">▸ NOVA PORUDŽBINA</div>
        </div>

        <h2 style="font-family: Georgia, serif; font-style: italic; font-size: 24px; text-align: center; margin: 16px 0;">${input.customerName}</h2>
        <p style="text-align: center; color: #5C3A22; font-family: 'JetBrains Mono', monospace;">📞 <a href="tel:${input.customerPhone}" style="color: #D4A53A; text-decoration: none;">${input.customerPhone}</a></p>
        ${input.customerEmail ? `<p style="text-align: center; color: #5C3A22; font-family: 'JetBrains Mono', monospace; font-size: 12px;">✉ ${input.customerEmail}</p>` : ""}

        <div style="background: #F5E9D0; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 13px;">
            ${itemsHtml}
            <tr><td colspan="2" style="border-top: 1px solid rgba(92,58,34,.2); padding-top: 12px;"></td></tr>
            <tr>
              <td style="font-family: Inter, sans-serif; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #1A0F05;">UKUPNO</td>
              <td style="text-align: right; font-family: Georgia, serif; font-style: italic; font-size: 22px; color: #D4A53A;">${input.total} RSD</td>
            </tr>
          </table>
        </div>

        ${input.pickupNote ? `<div style="background: rgba(212,165,58,.1); padding: 14px; font-size: 13px; color: #5C3A22;"><strong>Napomena:</strong> ${input.pickupNote}</div>` : ""}

        <p style="text-align: center; font-size: 11px; color: #5C3A22; margin-top: 24px; opacity: 0.6;">Order ID: ${input.orderId.slice(0, 8).toUpperCase()}</p>
      </div>
    `,
  });
}
