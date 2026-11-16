import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FACEBOOK_URL, RESORT_PHONE, RESORT_PHONE_TEL } from "@/lib/site";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("navigation");
  const legal = await getTranslations("legal");

  return (
    <footer className="site-footer">
      <div className="page-container footer-inner">
        <div className="footer-brand-block">
          <Link href="/" aria-label={t("homeLabel")}>
            <Image src="/netibo-brand-from-ad.webp" alt="Netibo sa Samal Beach Resort" width={1095} height={312} />
          </Link>
          <p>{t("address")}</p>
        </div>
        <nav className="footer-links" aria-label={t("navigationLabel")}>
          <Link href="/packages">{nav("packages")}</Link>
          <Link href="/stay">{nav("stay")}</Link>
          <Link href="/schedule">{nav("schedule")}</Link>
          <Link href="/store-and-bar">{nav("store")}</Link>
          <Link href="/find-us">{nav("findUs")}</Link>
          <Link href="/contact">{nav("contact")}</Link>
        </nav>
        <div className="footer-contact">
          <a href={`tel:${RESORT_PHONE_TEL}`}>{RESORT_PHONE}</a>
          <a href={FACEBOOK_URL} target="_blank" rel="noreferrer">{t("facebook")}</a>
        </div>
      </div>
      <div className="page-container footer-bottom"><span>{t("copyright")}</span><div className="footer-legal"><Link href="/privacy">{legal("privacy")}</Link><Link href="/terms">{legal("terms")}</Link><Link href="/contact">{nav("contact")}</Link></div></div>
    </footer>
  );
}
