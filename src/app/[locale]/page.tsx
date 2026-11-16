import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { HeroCarousel } from "@/components/hero-carousel";
import { Link } from "@/i18n/navigation";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <>
      <HeroCarousel />
      <section className="home-highlights page-container" aria-labelledby="highlights-title">
        <div className="section-heading">
          <p className="eyebrow">{t("highlightsEyebrow")}</p>
          <h2 id="highlights-title">{t("highlightsTitle")}</h2>
        </div>
        <div className="highlight-grid">
          <article className="highlight-card highlight-card-event">
            <span className="highlight-mark" aria-hidden="true">✳</span>
            <p className="eyebrow">{t("eventKicker")}</p>
            <h3>{t("exclusiveTitle")}</h3>
            <p>{t("exclusiveText")}</p>
            <Link className="text-link" href="/packages">{t("seePackages")} <span aria-hidden="true">↗</span></Link>
          </article>
          <article className="highlight-card highlight-card-stay">
            <span className="highlight-mark" aria-hidden="true">⌂</span>
            <p className="eyebrow">{t("stayKicker")}</p>
            <h3>{t("cottageTitle")}</h3>
            <p>{t("cottageText")}</p>
            <Link className="text-link" href="/stay">{t("seeStay")} <span aria-hidden="true">↗</span></Link>
          </article>
          <article className="highlight-card highlight-card-store">
            <span className="highlight-mark" aria-hidden="true">♨</span>
            <p className="eyebrow">{t("storeKicker")}</p>
            <h3>{t("storeTitle")}</h3>
            <p>{t("storeText")}</p>
            <Link className="text-link" href="/store-and-bar">{t("seeStore")} <span aria-hidden="true">↗</span></Link>
          </article>
        </div>
      </section>

      <section className="home-location-band">
        <div className="page-container home-location-inner">
          <div>
            <p className="eyebrow eyebrow-light">{t("locationKicker")}</p>
            <h2>{t("locationTitle")}</h2>
            <p>{t("locationText")}</p>
          </div>
          <Link className="button button-yellow" href="/find-us">{t("findUsAction")} <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <section className="ad-strip page-container" aria-label={t("priceListLabel")}>
        <div>
          <p className="eyebrow">{t("priceListKicker")}</p>
          <h2>{t("priceListTitle")}</h2>
          <p>{t("priceListText")}</p>
        </div>
        <Link className="ad-strip-image" href="/packages" aria-label={t("seePackages")}>
          <Image src="/facebook-price-list.webp" alt={t("priceListAlt")} width={1366} height={2048} sizes="(max-width: 640px) 45vw, 260px" />
        </Link>
      </section>
    </>
  );
}
