import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { ResortCatalog } from "@/components/price-list-card";

export const metadata: Metadata = {
  title: "Cottages and rooms",
  description: "Explore cottages, rooms, and gathering spaces at Netibo sa Samal.",
};

export default async function StayPage() {
  const t = await getTranslations("pages.stay");
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <ResortCatalog mode="units" />
    </section>
  );
}
