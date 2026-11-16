import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getPublicCatalog } from "@/lib/catalog-data";
import { formatPhp } from "@/lib/format";

type ResortCatalogProps = { mode: "packages" | "units" };

export async function ResortCatalog({ mode }: ResortCatalogProps) {
  const t = await getTranslations("catalog");
  const money = await getTranslations("money");
  const locale = await getLocale() as AppLocale;
  const { packages, entranceFees, units: resortUnits, source } = await getPublicCatalog(locale);
  const units = mode === "units";
  return (
    <div className="catalog-stack">
      {source === "error" && <p className="catalog-data-message">{t("databaseError")}</p>}
      {source === "database" && (units ? resortUnits.length === 0 : packages.length === 0 && entranceFees.length === 0) && <p className="catalog-data-message">{t("empty")}</p>}
      {!units && (
        <>
          {packages.length > 0 && <section className="catalog-section" aria-labelledby="exclusive-packages-title">
            <div className="section-heading section-heading-left"><p className="eyebrow">{t("exclusiveEyebrow")}</p><h2 id="exclusive-packages-title">{t("exclusiveTitle")}</h2></div>
            <div className="catalog-grid">
              {packages.map((item) => <article className="catalog-card" key={item.name}>
                <p className="catalog-kicker">{item.days === "weekday" ? t("weekdays") : item.days === "weekend" ? t("weekends") : t("roomsIncluded")}</p>
                <h3>{item.name}</h3>
                {item.included !== null && <p>{t("goodFor", { count: item.included })}</p>}
                {item.days === "any" && <p className="catalog-feature">{t("sixAirconRooms")}</p>}
                {"notes" in item && item.notes && <p>{item.notes}</p>}
                <strong className="catalog-price">{item.price === null ? t("askPrice") : formatPhp(item.price)}</strong>
              </article>)}
            </div>
          </section>}
          {entranceFees.length > 0 && <section className="catalog-section" aria-labelledby="entrance-fees-title">
            <div className="section-heading section-heading-left"><p className="eyebrow">{t("walkInEyebrow")}</p><h2 id="entrance-fees-title">{t("entranceFees")}</h2></div>
            <div className="catalog-grid catalog-grid-two">
              {entranceFees.map((item) => <article className="catalog-card" key={item.name}>
                <h3>{t(item.name === "Day tour" ? "dayTour" : "overnight")}</h3>
                <p>{t("adultEntrance")}</p><strong className="catalog-price">{item.adultPrice === null ? t("askPrice") : <>{formatPhp(item.adultPrice)} <span>{t("perHead")}</span></>}</strong>
                <p>{t("childEntrance")}</p><strong className="catalog-price catalog-price-small">{item.childPrice === null ? t("askPrice") : <>{formatPhp(item.childPrice)} <span>{t("perHead")}</span></>}</strong>
              </article>)}
            </div>
          </section>}
        </>
      )}
      <section className="catalog-section" aria-labelledby="units-title">
        <div className="section-heading section-heading-left"><p className="eyebrow">{t("unitsEyebrow")}</p><h2 id="units-title">{t("unitsTitle")}</h2></div>
        <div className="catalog-grid">
          {resortUnits.map((unit) => <article className="catalog-card catalog-unit-card" key={unit.name}>
            <h3>{unit.name}</h3>
            {unit.capacity && <p>{t("capacity", { capacity: unit.capacity })}</p>}
            {unit.features.map((feature) => <p className="catalog-feature" key={feature}>{t(feature)}</p>)}
            <strong className="catalog-price">{unit.price === null ? t("askPrice") : formatPhp(unit.price)}</strong>
          </article>)}
        </div>
        <p className="page-note">{money("pricesFromAdNote")}</p>
      </section>
    </div>
  );
}
