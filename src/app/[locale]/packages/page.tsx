import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { ResortCatalog } from "@/components/price-list-card";

export const metadata: Metadata = {
  title: "Exclusive packages",
  description: "See the Netibo sa Samal exclusive package details.",
};

export default async function PackagesPage() {
  const t = await getTranslations("pages.packages");
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <ResortCatalog mode="packages" />
    </section>
  );
}
