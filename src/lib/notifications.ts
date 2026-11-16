import "server-only";

// Optional email notifications through Resend (https://resend.com).
// Nothing is sent, and nothing fails, unless RESEND_API_KEY and BOOKING_EMAIL_FROM are set.
// TODO: Translate these messages (English only for now) and add an owner alert email if the resort gets one.

type Email = { to: string; subject: string; text: string };

export async function sendEmail({ to, subject, text }: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;
  if (!apiKey || !from) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function bookingLink(token: string, locale: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (!base) return "";
  const prefix = locale === "en" ? "" : `/${locale}`;
  return `\n\nYour private booking page: ${base}${prefix}/book/confirmation/${token}`;
}

type BookingEmailData = { guest_email: string | null; guest_name: string; ref_code: string; access_token: string };

export async function sendBookingReceivedEmail(booking: BookingEmailData, locale: string) {
  if (!booking.guest_email) return false;
  return sendEmail({
    to: booking.guest_email,
    subject: `We received your booking request (${booking.ref_code})`,
    text: `Hi ${booking.guest_name},\n\nThank you for your request to Netibo sa Samal Beach Resort. Your reference is ${booking.ref_code}. The request is pending: the date is not held yet. Please do not send payment until the resort approves it.${bookingLink(booking.access_token, locale)}`,
  });
}

const statusLines: Record<string, string> = {
  awaiting_payment: "Your request was approved. The resort will share payment instructions. The date is held until the payment deadline.",
  confirmed: "Your payment was received and your booking is confirmed. See you at the beach!",
  cancelled: "Your booking request was cancelled or could not be accommodated. Please contact the resort if you have questions.",
  completed: "Thank you for visiting Netibo sa Samal Beach Resort!",
};

export async function sendBookingStatusEmail(booking: BookingEmailData, status: string, locale = "en") {
  const line = statusLines[status];
  if (!booking.guest_email || !line) return false;
  return sendEmail({
    to: booking.guest_email,
    subject: `Update on your booking (${booking.ref_code})`,
    text: `Hi ${booking.guest_name},\n\n${line}\n\nReference: ${booking.ref_code}${bookingLink(booking.access_token, locale)}`,
  });
}
