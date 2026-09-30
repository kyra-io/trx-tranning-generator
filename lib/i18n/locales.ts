export const LANGUAGES = ["en", "pt_pt"] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

export const LANGUAGE_TAGS: Record<Language, string> = {
  en: "en",
  pt_pt: "pt-PT",
};

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}
