import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Store and bar",
  description: "Learn about food, store items, and the bar at Netibo sa Samal.",
};

export default async function StoreAndBarPage() {
  const t = await getTranslations("pages.storeBar");
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="feature-split">
        <article className="feature-note feature-note-food"><span className="panel-icon" aria-hidden="true">⌂</span><h2>{t("foodTitle")}</h2><p>{t("foodText")}</p></article>
        <article className="feature-note feature-note-bar"><span className="panel-icon" aria-hidden="true">✳</span><h2>{t("barTitle")}</h2><p>{t("barText")}</p></article>
      </div>
      <p className="page-note">{t("menuNote")}</p>
    </section>
  );
}
