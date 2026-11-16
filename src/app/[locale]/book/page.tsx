import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { Link } from "@/i18n/navigation";
import { FACEBOOK_URL, RESORT_PHONE, RESORT_PHONE_TEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a visit",
  description: "Send a booking request to Netibo sa Samal Beach Resort.",
};

export default async function BookPage() {
  const t = await getTranslations("pages.book");
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="contact-choice-grid">
        <a className="contact-choice" href={`tel:${RESORT_PHONE_TEL}`}><span className="choice-kicker">{t("callKicker")}</span><strong>{RESORT_PHONE}</strong><span>{t("callAction")} ↗</span></a>
        <a className="contact-choice contact-choice-sun" href={FACEBOOK_URL} target="_blank" rel="noreferrer"><span className="choice-kicker">{t("messageKicker")}</span><strong>{t("messageTitle")}</strong><span>{t("messageAction")} ↗</span></a>
      </div>
      <p className="page-note">{t("onlineNote")}</p>
      <Link className="text-link" href="/schedule">{t("scheduleAction")} ↗</Link>
    </section>
  );
}
