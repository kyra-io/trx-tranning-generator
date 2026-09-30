import { lang } from "next/root-params";

import { DEFAULT_LANGUAGE, isLanguage } from "./locales";
import { dictionaries } from "./translations";
import { Translator } from "./translator";

export async function getTranslations(): Promise<Translator> {
  let value: string | undefined;

  try {
    value = await lang();
  } catch {
    value = undefined;
  }

  const language = value && isLanguage(value) ? value : DEFAULT_LANGUAGE;

  return new Translator(language, dictionaries[language]);
}
