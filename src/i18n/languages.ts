import type { Locale } from "date-fns";
import { da, de, enUS, es, fr, nb, nl, sv } from "date-fns/locale";

export type AppLanguageCode = "en" | "sv" | "de" | "nl" | "da" | "no" | "fr" | "es";

export interface AppLanguage {
  code: AppLanguageCode;
  nativeName: string;
  englishName: string;
  intlLocale: string;
  speechLocale: string;
  dateFnsLocale: Locale;
}

export const DEFAULT_LANGUAGE: AppLanguageCode = "en";
export const LANGUAGE_STORAGE_KEY = "dartstreak-language";

export const APP_LANGUAGES: AppLanguage[] = [
  { code: "en", nativeName: "English", englishName: "English", intlLocale: "en-US", speechLocale: "en-US", dateFnsLocale: enUS },
  { code: "sv", nativeName: "Svenska", englishName: "Swedish", intlLocale: "sv-SE", speechLocale: "sv-SE", dateFnsLocale: sv },
  { code: "de", nativeName: "Deutsch", englishName: "German", intlLocale: "de-DE", speechLocale: "de-DE", dateFnsLocale: de },
  { code: "nl", nativeName: "Nederlands", englishName: "Dutch", intlLocale: "nl-NL", speechLocale: "nl-NL", dateFnsLocale: nl },
  { code: "da", nativeName: "Dansk", englishName: "Danish", intlLocale: "da-DK", speechLocale: "da-DK", dateFnsLocale: da },
  { code: "no", nativeName: "Norsk", englishName: "Norwegian", intlLocale: "nb-NO", speechLocale: "nb-NO", dateFnsLocale: nb },
  { code: "fr", nativeName: "Français", englishName: "French", intlLocale: "fr-FR", speechLocale: "fr-FR", dateFnsLocale: fr },
  { code: "es", nativeName: "Español", englishName: "Spanish", intlLocale: "es-ES", speechLocale: "es-ES", dateFnsLocale: es },
];

export const SUPPORTED_LANGUAGE_CODES = APP_LANGUAGES.map((language) => language.code);

const LANGUAGE_SET = new Set<string>(SUPPORTED_LANGUAGE_CODES);
const LANGUAGE_BY_CODE = new Map<AppLanguageCode, AppLanguage>(
  APP_LANGUAGES.map((language) => [language.code, language]),
);

export const normalizeLanguageCode = (language: string | null | undefined): AppLanguageCode => {
  if (!language) return DEFAULT_LANGUAGE;

  const baseCode = language.toLowerCase().split("-")[0];
  if (!LANGUAGE_SET.has(baseCode)) {
    return DEFAULT_LANGUAGE;
  }

  return baseCode as AppLanguageCode;
};

export const resolveAppLanguage = (language: string | null | undefined): AppLanguage => {
  const code = normalizeLanguageCode(language);
  return LANGUAGE_BY_CODE.get(code) ?? LANGUAGE_BY_CODE.get(DEFAULT_LANGUAGE)!;
};

export const getDateFnsLocale = (language: string | null | undefined): Locale => {
  return resolveAppLanguage(language).dateFnsLocale;
};

export const getIntlLocale = (language: string | null | undefined): string => {
  return resolveAppLanguage(language).intlLocale;
};

export const getSpeechLocale = (language: string | null | undefined): string => {
  return resolveAppLanguage(language).speechLocale;
};
