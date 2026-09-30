import type { Language } from "./locales";
import type { TranslationSchema } from "./translations/en";

type TemplateParams = Record<string, string | number>;

export class Translator {
  constructor(
    readonly language: Language,
    readonly messages: TranslationSchema,
  ) {}

  format(template: string, params: TemplateParams): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
      key in params ? String(params[key]) : match,
    );
  }
}
