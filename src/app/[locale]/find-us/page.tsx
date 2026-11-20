import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { ResortMap } from "@/components/resort-map";
import { Link } from "@/i18n/navigation";
import { FACEBOOK_URL, RESORT_COORDS, RESORT_MAPS_URL } from "@/lib/site";
import { ArrowUpRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Find Netibo sa Samal",
  description: "Find Netibo sa Samal Beach Resort at Purok 3, Barangay Kinawitnon, Babak, Samal, Davao del Norte.",
};

export default async function FindUsPage() {
  const t = await getTranslations("pages.findUs");
  const mapLabels = {
    mapLabel: t("map.label"),
    loading: t("map.loading"),
    error: t("map.error"),
    openInMaps: t("map.openInMaps"),
    zoomIn: t("map.zoomIn"),
    zoomOut: t("map.zoomOut"),
    rotateLeft: t("map.rotateLeft"),
    rotateRight: t("map.rotateRight"),
    tilt: t("map.tilt"),
    recenter: t("map.recenter"),
    orbitStart: t("map.orbitStart"),
    orbitStop: t("map.orbitStop"),
    hint: t("map.hint"),
    pinSubtitle: t("map.pinSubtitle"),
    windowsHelp: t("map.windowsHelp"),
    macHelp: t("map.macHelp"),
    mobileHelp: t("map.mobileHelp"),
  };
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="find-us-stage">
        <ResortMap lat={RESORT_COORDS.lat} lng={RESORT_COORDS.lng} name="Netibo sa Samal Beach Resort" mapsHref={RESORT_MAPS_URL} labels={mapLabels} />
        <div className="find-us-card">
          <p className="eyebrow">{t("addressLabel")}</p>
          <h2>{t("address")}</h2>
          <p>{t("travelNote")}</p>
          <div className="find-us-actions">
            <a className="button button-blue" href={RESORT_MAPS_URL} target="_blank" rel="noreferrer">{t("directionsAction")} <ArrowUpRightIcon size={16} /></a>
            <a className="text-link" href={FACEBOOK_URL} target="_blank" rel="noreferrer">{t("askDirections")} <ArrowUpRightIcon size={16} /></a>
            <Link className="text-link" href="/contact">{t("contactAction")}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
