"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";

const links = [
  { href: "/packages", key: "packages" },
  { href: "/stay", key: "stay" },
  { href: "/schedule", key: "schedule" },
  { href: "/find-us", key: "findUs" },
] as const;

export function SiteHeader() {
  const t = useTranslations("navigation");
  const actions = useTranslations("actions");
  const common = useTranslations("common");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  }

  return (
    <header className="site-header">
      <div className="site-header-inner page-container">
        <Link className="brand" href="/" aria-label={common("homeLabel")} onClick={() => setMenuOpen(false)}>
          <Image src="/netibo-brand-from-ad.webp" alt="Netibo sa Samal Beach Resort" width={1095} height={312} preload />
        </Link>
        <nav className="desktop-nav" aria-label={t("label")}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined}>
              {t(link.key)}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitcher />
          <Link className="button button-small button-yellow header-book" href="/book">{actions("book")}</Link>
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? actions("closeMenu") : actions("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label={t("label")}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mobile-nav-inner page-container">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(link.key)}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
