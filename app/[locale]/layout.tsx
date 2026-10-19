import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Devanagari, Public_Sans } from "next/font/google";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/lib/i18n/config";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Hindi / Marathi interface text and names
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
});

/** The language segment is added by Proxy from the language cookie (see lib/i18n/config.ts). */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const param = await rootLocale();
  const locale = isLocale(param) ? param : DEFAULT_LOCALE;
  return (
    <html lang={locale} className={`${publicSans.variable} ${geistMono.variable} ${devanagari.variable} h-full antialiased`}>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) add attributes to <body> */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  );
}
