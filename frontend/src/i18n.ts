import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import bs from "./locales/bs/translation.json";
import en from "./locales/en/translation.json";
import de from "./locales/de/translation.json";

const savedLang = localStorage.getItem("decibel_lang") || "bs";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      bs: { translation: bs },
      en: { translation: en },
      de: { translation: de }
    },
    lng: savedLang,
    fallbackLng: "bs",
    interpolation: { escapeValue: false }
  });

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("decibel_lang", lng);
});

export default i18n;
