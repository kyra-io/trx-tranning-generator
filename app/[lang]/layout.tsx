import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { notFound } from "next/navigation";

import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import {
  isLanguage,
  LANGUAGE_TAGS,
  LANGUAGES,
} from "@/lib/i18n/locales";
import { dictionaries } from "@/lib/i18n/translations";
import { TranslationsProvider } from "@/lib/i18n/translations-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return LANGUAGES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    return {};
  }

  return {
    title: dictionaries[lang].metadata.title,
    description: dictionaries[lang].metadata.description,
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  return (
    <html
      lang={LANGUAGE_TAGS[lang]}
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-200 font-sans text-zinc-900">
        <TranslationsProvider language={lang} messages={dictionaries[lang]}>
          <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-zinc-50">
            <header className="px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-3">
              <span className="text-sm font-bold tracking-[0.18em] text-zinc-900">
                TRX
              </span>
            </header>
            <main className="flex-1 px-5 pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
              {children}
            </main>
            <BottomNavigation />
          </div>
        </TranslationsProvider>
      </body>
    </html>
  );
}
