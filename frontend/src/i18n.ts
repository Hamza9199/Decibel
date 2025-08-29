import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import bs from "./locales/bs/translation.json";
import en from "./locales/en/translation.json";
import de from "./locales/de/translation.json";

function detectLanguage() {
  const savedLang = localStorage.getItem("decibel_lang");
  if (savedLang) return savedLang;

  const supported = ["bs", "en", "de"];

  const langMap: Record<string, string> = {
    de: "de", de_DE: "de", de_AT: "de", de_CH: "de",
    en: "en", en_US: "en", en_GB: "en", en_AU: "en", en_CA: "en",
    bs: "bs", hr: "bs", sr: "bs", sh: "bs",
    ba: "bs", rs: "bs", hr_HR: "bs", me: "bs", 
  };

  const langs = navigator.languages || [navigator.language];
  for (const l of langs) {
    const code = l.replace("-", "_").toLowerCase();
    if (langMap[code]) return langMap[code];
    const short = code.split("_")[0];
    if (langMap[short]) return langMap[short];
    if (supported.includes(short)) return short;
  }
  return "bs";
}

const initialLang = detectLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      bs: { translation: bs },
      en: { translation: en },
      de: { translation: de }
    },
    lng: initialLang,
    fallbackLng: "bs",
    interpolation: { escapeValue: false }
  });

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("decibel_lang", lng);
});

export default i18n;