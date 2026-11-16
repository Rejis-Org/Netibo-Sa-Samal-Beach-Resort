import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";

type HomePageProps = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const home = await getTranslations("home");
  const navigation = await getTranslations("navigation");
  const actions = await getTranslations("actions");

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Netibo sa Samal home">
          <Image className="brand-image" src="/netibo-brand-from-ad.webp" alt="Netibo sa Samal Beach Resort" width={1095} height={312} preload />
        </a>
        <nav className="desktop-nav" aria-label={navigation("label")}>
          <a href="#packages">{navigation("packages")}</a>
          <a href="#stay">{navigation("stay")}</a>
          <a href="#find-us">{navigation("findUs")}</a>
          <a href="#store">{navigation("store")}</a>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher />
          <a className="button button-small button-yellow" href="#booking">{actions("book")}</a>
        </div>
      </header>

      <section className="hero section-wrap" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="sun-mark" aria-hidden="true">✳</span>{home("eyebrow")}</p>
          <h1>{home("title")}</h1>
          <p className="hero-caption">{home("caption")}</p>
          <div className="hero-actions">
            <a className="button button-blue" href="#booking">{actions("book")} <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#packages">{actions("explore")} <span aria-hidden="true">↓</span></a>
          </div>
          <p className="location-stamp"><span aria-hidden="true" />{home("locationStamp")}</p>
        </div>
        <div className="hero-art" role="img" aria-label={home("photoLabel")}>
          <div className="photo-placeholder"><span>{home("photoLabel")}</span><small>{home("photoNote")}</small></div>
          <div className="sun-disc" aria-hidden="true" />
          <div className="shoreline" aria-hidden="true" />
          <div className="hero-sticker"><strong>{home("stickerTitle")}</strong><span>{home("stickerPlace")}</span></div>
        </div>
      </section>

      <section className="welcome-band" aria-label={home("highlightsTitle")}>
        <p>{home("highlightsTitle")}</p>
        <span>✳</span><span>{home("welcomeByWater")}</span><span>✳</span><span>{home("welcomePeople")}</span><span>✳</span>
        <span>{home("welcomeDays")}</span>
      </section>

      <section className="section-wrap highlights" id="stay">
        <div className="section-heading">
          <p className="eyebrow">{home("highlightsEyebrow")}</p>
          <h2>{home("highlightsTitle")}</h2>
        </div>
        <div className="highlight-grid">
          <article className="highlight highlight-blue">
            <span className="highlight-number">01</span><span className="highlight-icon" aria-hidden="true">☼</span>
            <h3>{home("exclusiveTitle")}</h3><p>{home("exclusiveText")}</p>
          </article>
          <article className="highlight highlight-sand">
            <span className="highlight-number">02</span><span className="highlight-icon" aria-hidden="true">⌂</span>
            <h3>{home("cottageTitle")}</h3><p>{home("cottageText")}</p>
          </article>
          <article className="highlight highlight-green" id="store">
            <span className="highlight-number">03</span><span className="highlight-icon" aria-hidden="true">♨</span>
            <h3>{home("storeTitle")}</h3><p>{home("storeText")}</p>
          </article>
        </div>
      </section>

      <section className="packages-band" id="packages">
        <div className="section-wrap packages-inner">
          <div>
            <p className="eyebrow eyebrow-light">{home("packagesEyebrow")}</p>
            <h2>{home("packagesTitle")}</h2>
            <p>{home("packagesText")}</p>
          </div>
          <div className="price-ad-card">
            <a className="price-ad-image" href="/facebook-price-list.webp" target="_blank" rel="noreferrer" aria-label={home("adAction")}>
              <Image src="/facebook-price-list.webp" alt={home("adAlt")} width={1366} height={2048} sizes="(max-width: 640px) 34vw, 140px" />
            </a>
            <div className="price-ad-copy">
              <span className="price-ad-kicker">{home("adKicker")}</span>
              <h3>{home("adTitle")}</h3>
              <p>{home("adText")}</p>
              <a className="price-ad-link" href="/facebook-price-list.webp" target="_blank" rel="noreferrer">{home("adAction")} <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      </section>

      <section className="section-wrap location-row" id="find-us">
        <div className="location-art" aria-hidden="true"><span>Samal</span><i /></div>
        <div className="location-copy">
          <p className="eyebrow">{home("locationEyebrow")}</p>
          <h2>{home("locationTitle")}</h2>
          <p>{home("locationText")}</p>
          <a className="text-link" href="tel:09274852412">0927 485 2412 <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="booking-band" id="booking">
        <div className="section-wrap booking-inner">
          <div><p className="eyebrow eyebrow-light">{home("bookingEyebrow")}</p><h2>{home("bookingTitle")}</h2><p>{home("bookingText")}</p></div>
          <a className="button button-yellow" href="https://www.facebook.com/profile.php?id=61577566485558" target="_blank" rel="noreferrer">{actions("chat")} <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="section-wrap footer-inner">
          <a className="brand brand-footer" href="#top" aria-label="Netibo sa Samal home"><Image className="brand-image" src="/netibo-brand-from-ad.webp" alt="Netibo sa Samal Beach Resort" width={1095} height={312} /></a>
          <p>{home("footerNote")}</p>
          <a href="https://www.facebook.com/profile.php?id=61577566485558" target="_blank" rel="noreferrer">Facebook ↗</a>
        </div>
      </footer>

      <div className="mobile-bar">
        <a className="button button-blue" href="#booking">{actions("book")}</a>
        <a className="button button-yellow" href="https://www.facebook.com/profile.php?id=61577566485558" target="_blank" rel="noreferrer">{actions("chat")}</a>
      </div>
    </main>
  );
}