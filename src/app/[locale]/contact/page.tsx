import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { FACEBOOK_URL, RESORT_PHONE_TEL } from "@/lib/site";
import { getResortPhone } from "@/lib/public-settings";
import { ArrowUpRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact Netibo sa Samal",
  description: "Call or message Netibo sa Samal Beach Resort.",
};

export default async function ContactPage() {
  const t = await getTranslations("pages.contact");
  const phone = await getResortPhone();
  return (
    <section className="page-section page-container">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="contact-choice-grid">
        <a className="contact-choice" href={`tel:${phone.replace(/[^+\d]/g, "") || RESORT_PHONE_TEL}`}><span className="choice-kicker">{t("phoneLabel")}</span><strong>{phone}</strong><span>{t("callAction")} <ArrowUpRightIcon size={16} /></span></a>
        <a className="contact-choice contact-choice-sun" href={FACEBOOK_URL} target="_blank" rel="noreferrer"><span className="choice-kicker">{t("messengerLabel")}</span><strong>{t("messengerTitle")}</strong><span>{t("messageAction")} <ArrowUpRightIcon size={16} /></span></a>
      </div>
    </section>
  );
}
