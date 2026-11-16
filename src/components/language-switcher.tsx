"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

const languageNames: Record<AppLocale, string> = {
  en: "English",
  fil: "Tagalog",
  ceb: "Cebuano",
};

export function LanguageSwitcher() {
  const t = useTranslations("actions");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="language-picker">
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(event) => router.replace(pathname, { locale: event.target.value as AppLocale })}
      >
        {Object.entries(languageNames).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}