import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { Link } from "@/i18n/navigation";
import { ArrowUpRightIcon, CalendarIcon } from "@/components/icons";
import { getAvailabilityWindow, getPublicAvailability } from "@/lib/booking-data";
import type { AppLocale } from "@/i18n/routing";

export const metadata: Metadata = { title: "Availability schedule", description: "Check resort availability for your visit to Netibo sa Samal." };

export default async function SchedulePage() {
  const [t, localeValue] = await Promise.all([getTranslations("pages.schedule"), getLocale()]);
  const { start, end } = getAvailabilityWindow();
  const days = await getPublicAvailability(start, end);
  return <section className="page-section page-container">
    <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
    {days ? <div className="schedule-calendar-wrap">
      <AvailabilityCalendar
        days={days}
        locale={localeValue as AppLocale}
        minDate={start}
        maxDate={end}
        selectable={false}
        labels={{
          previousMonth: t("calendar.previousMonth"),
          nextMonth: t("calendar.nextMonth"),
          available: t("calendar.available"),
          partial: t("calendar.partial"),
          exclusive: t("calendar.exclusive"),
          closed: t("calendar.closed"),
          legend: t("calendar.legend"),
        }}
      />
      <p className="page-note">{t("calendarNote")}</p>
      <Link className="button button-blue" href="/book">{t("bookAction")} <ArrowUpRightIcon size={18} /></Link>
    </div> : <div className="empty-panel schedule-panel"><span className="panel-icon" aria-hidden="true"><CalendarIcon size={28} /></span><h2>{t("calendarTitle")}</h2><p>{t("calendarText")}</p><Link className="button button-blue" href="/contact">{t("contactAction")} <ArrowUpRightIcon size={18} /></Link></div>}
  </section>;
}
