import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { Link } from "@/i18n/navigation";
import { FACEBOOK_URL } from "@/lib/site";
import { ArrowUpRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Find Netibo sa Samal",
  description: "Find Netibo sa Samal Beach Resort in Barangay Kinawitnon, Island Garden City of Samal.",
};

export default async function FindUsPage() {
  const t = await getTranslations("pages.findUs");
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="find-us-grid">
        <div className="map-placeholder" aria-label={t("mapPlaceholder")}><span className="map-pin" aria-hidden="true" /><span>{t("mapPlaceholder")}</span></div>
        <div className="find-us-details">
          <p className="eyebrow">{t("addressLabel")}</p>
          <h2>{t("address")}</h2>
          <p>{t("travelNote")}</p>
          <a className="text-link" href={FACEBOOK_URL} target="_blank" rel="noreferrer">{t("askDirections")} <ArrowUpRightIcon size={16} /></a>
          <Link className="button button-blue" href="/contact">{t("contactAction")}</Link>
        </div>
      </div>
    </section>
  );
}
