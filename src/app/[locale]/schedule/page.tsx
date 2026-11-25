import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { ScheduleExplorer } from "@/components/schedule-explorer";
import { Link } from "@/i18n/navigation";
import { ArrowUpRightIcon, CalendarIcon } from "@/components/icons";
import { getAvailabilityWindow, getBookingOptions, getPublicAvailability, getUnitAvailability } from "@/lib/booking-data";
import type { AppLocale } from "@/i18n/routing";

export const metadata: Metadata = { title: "Availability schedule", description: "Check resort availability for your visit to Netibo sa Samal." };

export default async function SchedulePage() {
  const [t, localeValue] = await Promise.all([getTranslations("pages.schedule"), getLocale()]);
  const locale = localeValue as AppLocale;
  const { start, end } = getAvailabilityWindow();
  const [days, unitRows, options] = await Promise.all([getPublicAvailability(start, end), getUnitAvailability(start, end), getBookingOptions(locale)]);
  // Without per-unit data the calendar still works; the "which places are free" panel simply stays hidden.
  const units = unitRows && options ? options.units.filter((unit) => unit.active).map((unit) => ({ id: unit.id, name: unit.name, price: unit.price })) : [];
  return <section className="page-section page-container">
    <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
    {days ? <div className="schedule-calendar-wrap">
      <ScheduleExplorer days={days} unitRows={unitRows ?? []} units={units} locale={locale} minDate={start} maxDate={end} />
      <p className="page-note">{t("calendarNote")}</p>
      <Link className="button button-blue" href="/book">{t("bookAction")} <ArrowUpRightIcon size={18} /></Link>
    </div> : <div className="empty-panel schedule-panel"><span className="panel-icon" aria-hidden="true"><CalendarIcon size={28} /></span><h2>{t("calendarTitle")}</h2><p>{t("calendarText")}</p><Link className="button button-blue" href="/contact">{t("contactAction")} <ArrowUpRightIcon size={18} /></Link></div>}
  </section>;
}
