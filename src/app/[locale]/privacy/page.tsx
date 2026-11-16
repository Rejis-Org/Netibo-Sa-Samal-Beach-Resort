import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "Privacy information for Netibo sa Samal Beach Resort.",
};

export default async function PrivacyPage() {
  const t = await getTranslations("pages.privacy");
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <article className="legal-content">
        <h2>{t("currentTitle")}</h2>
        <p>{t("currentText")}</p>
        <p className="todo-note">{t("todo")}</p>
      </article>
    </section>
  );
}
