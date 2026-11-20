import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { HeroCarousel } from "@/components/hero-carousel";
import { HeroVideo } from "@/components/hero-video";
import { PriceListLightbox } from "@/components/price-list-lightbox";
import { Link } from "@/i18n/navigation";
import { ArrowUpRightIcon, HomeIcon, SunIcon, UtensilsIcon } from "@/components/icons";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <>
      <div className="hero-wrap">
        <div className="hero-poster" aria-hidden="true" />
        <HeroVideo />
        <HeroCarousel />
      </div>
      <section className="home-highlights page-container" aria-labelledby="highlights-title">
        <div className="section-heading">
          <p className="eyebrow">{t("highlightsEyebrow")}</p>
          <h2 id="highlights-title">{t("highlightsTitle")}</h2>
        </div>
        <div className="highlight-grid">
          <article className="highlight-card highlight-card-event">
            <div className="highlight-photo">
              <Image src="/images/mapitag-function-hall/mapitag-function-hall-02-landscape.jpg" alt="" fill sizes="(max-width: 740px) 100vw, 600px" />
            </div>
            <div className="highlight-body">
              <p className="eyebrow highlight-kicker"><span className="highlight-mark" aria-hidden="true"><SunIcon size={18} /></span>{t("eventKicker")}</p>
              <h3>{t("exclusiveTitle")}</h3>
              <p>{t("exclusiveText")}</p>
              <Link className="text-link" href="/packages">{t("seePackages")} <ArrowUpRightIcon size={16} /></Link>
            </div>
          </article>
          <article className="highlight-card highlight-card-stay">
            <div className="highlight-photo">
              <Image src="/images/cottage/cottage-05-landscape.jpg" alt="" fill sizes="(max-width: 740px) 100vw, 280px" />
            </div>
            <div className="highlight-body">
              <p className="eyebrow highlight-kicker"><span className="highlight-mark" aria-hidden="true"><HomeIcon size={18} /></span>{t("stayKicker")}</p>
              <h3>{t("cottageTitle")}</h3>
              <p>{t("cottageText")}</p>
              <Link className="text-link" href="/stay">{t("seeStay")} <ArrowUpRightIcon size={16} /></Link>
            </div>
          </article>
          <article className="highlight-card highlight-card-store">
            <div className="highlight-photo">
              <Image src="/images/canteen/canteen-01-landscape.jpg" alt="" fill sizes="(max-width: 740px) 100vw, 280px" />
            </div>
            <div className="highlight-body">
              <p className="eyebrow highlight-kicker"><span className="highlight-mark" aria-hidden="true"><UtensilsIcon size={18} /></span>{t("storeKicker")}</p>
              <h3>{t("storeTitle")}</h3>
              <p>{t("storeText")}</p>
              <Link className="text-link" href="/store-and-bar">{t("seeStore")} <ArrowUpRightIcon size={16} /></Link>
            </div>
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
          <Link className="button button-yellow" href="/find-us">{t("findUsAction")} <ArrowUpRightIcon size={18} /></Link>
        </div>
      </section>
      <section className="ad-strip page-container" aria-label={t("priceListLabel")}>
        <div>
          <p className="eyebrow">{t("priceListKicker")}</p>
          <h2>{t("priceListTitle")}</h2>
          <p>{t("priceListText")}</p>
        </div>
        <PriceListLightbox src="/price-list.png" alt={t("priceListAlt")} title={t("priceListTitle")} width={2400} height={4160} />
      </section>
    </>
  );
}
