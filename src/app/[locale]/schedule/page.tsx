import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Availability schedule",
  description: "Check resort availability for your visit to Netibo sa Samal.",
};

export default async function SchedulePage() {
  const t = await getTranslations("pages.schedule");
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="empty-panel schedule-panel">
        <span className="panel-icon" aria-hidden="true">▦</span>
        <h2>{t("calendarTitle")}</h2>
        <p>{t("calendarText")}</p>
        <Link className="button button-blue" href="/contact">{t("contactAction")} <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  );
}
