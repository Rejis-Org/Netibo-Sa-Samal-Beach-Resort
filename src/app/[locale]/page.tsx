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
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>Netibo <em>sa Samal</em></span>
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
          <p className="eyebrow"><span className="sun-mark" aria-hidden="true">âœ³</span>{home("eyebrow")}</p>
          <h1>{home("title")}</h1>
          <p className="hero-caption">{home("caption")}</p>
          <div className="hero-actions">
            <a className="button button-blue" href="#booking">{actions("book")} <span aria-hidden="true">â†—</span></a>
            <a className="text-link" href="#packages">{actions("explore")} <span aria-hidden="true">â†“</span></a>
          </div>
          <p className="location-stamp"><span aria-hidden="true">âŒ–</span> {home("locationStamp")}</p>
        </div>
        <div className="hero-art" role="img" aria-label={home("photoLabel")}>
          <div className="photo-placeholder"><span>{home("photoLabel")}</span><small>{home("photoNote")}</small></div>
          <div className="sun-disc" aria-hidden="true" />
          <div className="palm-leaf leaf-one" aria-hidden="true">âŒ</div>
          <div className="palm-leaf leaf-two" aria-hidden="true">âŒ</div>
          <div className="shoreline" aria-hidden="true" />
          <div className="hero-sticker"><strong>{home("stickerTitle")}</strong><span>{home("stickerPlace")}</span></div>
        </div>
      </section>

      <section className="welcome-band" aria-label={home("highlightsTitle")}>
        <p>{home("highlightsTitle")}</p>
        <span>âœ³</span><span>{home("welcomeByWater")}</span><span>âœ³</span><span>{home("welcomePeople")}</span><span>âœ³</span>
        <span>{home("welcomeDays")}</span>
      </section>

      <section className="section-wrap highlights" id="stay">
        <div className="section-heading">
          <p className="eyebrow">{home("highlightsEyebrow")}</p>
          <h2>{home("highlightsTitle")}</h2>
        </div>
        <div className="highlight-grid">
          <article className="highlight highlight-blue">
            <span className="highlight-number">01</span><span className="highlight-icon" aria-hidden="true">â˜¼</span>
            <h3>{home("exclusiveTitle")}</h3><p>{home("exclusiveText")}</p>
          </article>
          <article className="highlight highlight-sand">
            <span className="highlight-number">02</span><span className="highlight-icon" aria-hidden="true">âŒ‚</span>
            <h3>{home("cottageTitle")}</h3><p>{home("cottageText")}</p>
          </article>
          <article className="highlight highlight-green" id="store">
            <span className="highlight-number">03</span><span className="highlight-icon" aria-hidden="true">â™¨</span>
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
          <div className="price-placeholder">
            <span className="price-sun" aria-hidden="true">âœ³</span>
            <p>{home("placeholder")}</p>
            <small>{home("packagesTodo")}</small>
          </div>
        </div>
      </section>

      <section className="section-wrap location-row" id="find-us">
        <div className="location-art" aria-hidden="true"><span>Samal</span><i>âŒ–</i></div>
        <div className="location-copy">
          <p className="eyebrow">{home("locationEyebrow")}</p>
          <h2>{home("locationTitle")}</h2>
          <p>{home("locationText")}</p>
          <a className="text-link" href="tel:09274852412">0927 485 2412 <span aria-hidden="true">â†—</span></a>
        </div>
      </section>

      <section className="booking-band" id="booking">
        <div className="section-wrap booking-inner">
          <div><p className="eyebrow eyebrow-light">{home("bookingEyebrow")}</p><h2>{home("bookingTitle")}</h2><p>{home("bookingText")}</p></div>
          <a className="button button-yellow" href="https://www.facebook.com/profile.php?id=61577566485558" target="_blank" rel="noreferrer">{actions("chat")} <span aria-hidden="true">â†—</span></a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="section-wrap footer-inner">
          <a className="brand brand-footer" href="#top"><span className="brand-mark" aria-hidden="true">N</span><span>Netibo <em>sa Samal</em></span></a>
          <p>{home("footerNote")}</p>
          <a href="https://www.facebook.com/profile.php?id=61577566485558" target="_blank" rel="noreferrer">Facebook â†—</a>
        </div>
      </footer>

      <div className="mobile-bar">
        <a className="button button-blue" href="#booking">{actions("book")}</a>
        <a className="button button-yellow" href="https://www.facebook.com/profile.php?id=61577566485558" target="_blank" rel="noreferrer">{actions("chat")}</a>
      </div>
    </main>
  );
}