import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import bs from "./locales/bs/translation.json";
import en from "./locales/en/translation.json";
import de from "./locales/de/translation.json";

// Get device language
const getDeviceLanguage = () => {
  const locales = Localization.getLocales();
  if (locales.length > 0) {
    const deviceLang = locales[0].languageCode;
    // Map device language to supported languages
    if (deviceLang === 'en') return 'en';
    if (deviceLang === 'de') return 'de';
    return 'bs'; // Default to Bosnian
  }
  return 'bs';
};

// Language detection plugin for React Native
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const savedLang = await AsyncStorage.getItem("decibel_lang");
      if (savedLang) {
        callback(savedLang);
      } else {
        const deviceLang = getDeviceLanguage();
        callback(deviceLang);
      }
    } catch (error) {
      console.error('Error detecting language:', error);
      callback('bs'); // Fallback to Bosnian
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem("decibel_lang", lng);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }
};

const initI18n = async () => {
  await i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3', // Important for React Native
      resources: {
        bs: { translation: bs },
        en: { translation: en },
        de: { translation: de }
      },
      fallbackLng: "bs",
      interpolation: { 
        escapeValue: false 
      },
      react: {
        useSuspense: false // Important for React Native
      }
    });
};

// Initialize i18n
initI18n();

export default i18n;
