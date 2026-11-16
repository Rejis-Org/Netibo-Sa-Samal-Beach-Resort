import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FACEBOOK_URL } from "@/lib/site";

export async function MobileActionBar() {
  const t = await getTranslations("actions");
  return (
    <div className="mobile-action-bar" aria-label={t("quickActions")}>
      <Link className="button button-blue" href="/book">{t("book")}</Link>
      <a className="button button-yellow" href={FACEBOOK_URL} target="_blank" rel="noreferrer">{t("chat")}</a>
    </div>
  );
}
