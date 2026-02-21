import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, resolveAppLanguage, SUPPORTED_LANGUAGE_CODES } from "./languages";
import en from "./locales/en.json";
import sv from "./locales/sv.json";
import de from "./locales/de.json";
import nl from "./locales/nl.json";
import da from "./locales/da.json";
import no from "./locales/no.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sv: { translation: sv },
      de: { translation: de },
      nl: { translation: nl },
      da: { translation: da },
      no: { translation: no },
      fr: { translation: fr },
      es: { translation: es },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    cleanCode: true,
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

i18n.on("languageChanged", (language) => {
  const resolved = resolveAppLanguage(language);
  document.documentElement.lang = resolved.code;
});

document.documentElement.lang = resolveAppLanguage(i18n.resolvedLanguage || i18n.language).code;

export default i18n;
