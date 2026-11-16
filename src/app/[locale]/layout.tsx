import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { MotionProvider } from "@/components/motion-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileActionBar } from "@/components/mobile-action-bar";
import { routing } from "@/i18n/routing";
import "../globals.css";

const headingFont = Baloo_2({ variable: "--font-heading", subsets: ["latin"] });
const bodyFont = Nunito({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Netibo sa Samal Beach Resort",
    template: "%s | Netibo sa Samal",
  },
  description: "Plan a beach stay at Netibo sa Samal Beach Resort in Barangay Kinawitnon, Island Garden City of Samal.",
  openGraph: {
    title: "Netibo sa Samal Beach Resort",
    description: "Weekend vibes are better by the beach! Relax, unwind, and create beautiful memories with family and friends.",
    type: "website",
    images: ["/facebook-price-list.webp"],
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <MotionProvider>
            <a href="#main" className="skip-link">{messages.common.skipToContent}</a>
            <SiteHeader />
            <main id="main">{children}</main>
            <SiteFooter />
            <MobileActionBar />
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
