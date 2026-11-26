import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { Link } from "@/i18n/navigation";
import { CheckIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Booking request received", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

export default async function BookingConfirmationPage({ params }: Props) {
  const [{ token }, t] = await Promise.all([params, getTranslations("pages.bookingFlow.confirmation")]);
  if (!/^[a-f0-9]{48,80}$/i.test(token)) notFound();
  const { data } = await createSupabaseServiceClient().from("bookings")
    .select("ref_code,date_start,date_end,status,total_amount")
    .eq("access_token", token).maybeSingle();
  if (!data) notFound();
  const formatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" });
  const startLabel = formatter.format(new Date(`${data.date_start}T12:00:00+08:00`));
  const date = data.date_end > data.date_start ? `${startLabel} – ${formatter.format(new Date(`${data.date_end}T12:00:00+08:00`))}` : startLabel;
  return <section className="page-section page-container">
    <article className="booking-confirmation">
      <span className="confirmation-icon" aria-hidden="true"><CheckIcon size={28} strokeWidth={2.75} /></span>
      <p className="eyebrow">{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("description")}</p>
      <dl><div><dt>{t("reference")}</dt><dd>{data.ref_code}</dd></div><div><dt>{t("date")}</dt><dd>{date}</dd></div><div><dt>{t("estimate")}</dt><dd>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(data.total_amount)}</dd></div><div><dt>{t("status")}</dt><dd>{t(`statuses.${data.status}` as never)}</dd></div></dl>
      <p className="confirmation-reminder">{t("reminder")}</p>
      <Link className="button button-blue" href="/">{t("backHome")}</Link>
    </article>
  </section>;
}
