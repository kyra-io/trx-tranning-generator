"use client";

import { usePathname, useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n/locales";
import { useLocale, useTranslations } from "@/lib/i18n/translations-provider";

const languageLabels: Record<Language, string> = {
  en: "EN",
  pt_pt: "PT",
};

const nextLanguage: Record<Language, Language> = {
  en: "pt_pt",
  pt_pt: "en",
};

export function LanguageToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const language = useLocale();
  const t = useTranslations();
  const target = nextLanguage[language];

  function handleToggle() {
    const segments = pathname.split("/");
    segments[1] = target;
    const search = typeof window === "undefined" ? "" : window.location.search;
    router.replace(`${segments.join("/")}${search}`);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={t.messages.language_toggle.aria_label}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold tracking-wide text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="size-4"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path
          strokeLinecap="round"
          d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5s-1.1 6.1-3.3 8.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z"
        />
      </svg>
      <span>{languageLabels[language]}</span>
    </button>
  );
}
