import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Booking terms",
  description: "Booking information for Netibo sa Samal Beach Resort.",
};

export default async function TermsPage() {
  const t = await getTranslations("pages.terms");
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <article className="legal-content">
        <h2>{t("priceTitle")}</h2>
        <p>{t("priceText")}</p>
        <h2>{t("bookingTitle")}</h2>
        <p>{t("bookingText")}</p>
        <p className="todo-note">{t("todo")}</p>
      </article>
    </section>
  );
}
