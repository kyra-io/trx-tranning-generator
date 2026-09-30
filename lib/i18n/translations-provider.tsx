"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { DEFAULT_LANGUAGE, type Language } from "./locales";
import { Translator } from "./translator";
import { en, type TranslationSchema } from "./translations/en";

const defaultTranslator = new Translator(DEFAULT_LANGUAGE, en);

const TranslationsContext = createContext<Translator>(defaultTranslator);

export function TranslationsProvider({
  language,
  messages,
  children,
}: {
  language: Language;
  messages: TranslationSchema;
  children: ReactNode;
}) {
  const translator = useMemo(
    () => new Translator(language, messages),
    [language, messages],
  );

  return (
    <TranslationsContext.Provider value={translator}>
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations() {
  return useContext(TranslationsContext);
}

export function useLocale() {
  return useContext(TranslationsContext).language;
}
