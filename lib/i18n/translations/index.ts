import { en, type TranslationSchema } from "./en";
import { ptPt } from "./pt_pt";
import type { Language } from "../locales";

export type { TranslationSchema };

export const dictionaries: Record<Language, TranslationSchema> = {
  en,
  pt_pt: ptPt,
};
