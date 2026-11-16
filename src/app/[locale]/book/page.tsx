import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { BookingRequestForm } from "@/components/booking-request-form";
import { getAvailabilityWindow, getBookingOptions, getPublicAvailability } from "@/lib/booking-data";
import { FACEBOOK_URL, RESORT_PHONE_TEL } from "@/lib/site";
import { getResortPhone } from "@/lib/public-settings";
import type { AppLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "Book a visit",
  description: "Send a booking request to Netibo sa Samal Beach Resort.",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function BookPage({ searchParams }: Props) {
  const [t, localeValue, query, phone, options] = await Promise.all([
    getTranslations("pages.book"), getLocale(), searchParams, getResortPhone(), getBookingOptions(await getLocale() as AppLocale),
  ]);
  const locale = localeValue as AppLocale;
  const { start, end } = getAvailabilityWindow();
  const days = options ? await getPublicAvailability(start, end) : null;
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="booking-layout">
        {options && days ? <BookingRequestForm locale={locale} options={options} days={days} minDate={start} maxDate={end} error={query.error} /> : <div className="booking-unavailable">
          <h2>{t("offlineTitle")}</h2><p>{t("offlineText")}</p>
          <a className="button button-blue" href={`tel:${phone.replace(/[^+\d]/g, "") || RESORT_PHONE_TEL}`}>{t("callKicker")}: {phone}</a>
          <a className="button button-outline" href={FACEBOOK_URL} target="_blank" rel="noreferrer">{t("messageKicker")}</a>
        </div>}
        <aside className="booking-aside">
          <p className="eyebrow">{t("asideEyebrow")}</p><h2>{t("asideTitle")}</h2>
          <p>{t("asideText")}</p><ul><li>{t("asidePending")}</li><li>{t("asidePay")}</li><li>{t("asidePrivacy")}</li></ul>
        </aside>
      </div>
    </section>
  );
}
