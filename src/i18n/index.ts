import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import { prefs } from "@/services/auth";

export const LANGUAGES = [
  { code: "en", label: "English", englishName: "English" },
  { code: "hi", label: "हिन्दी", englishName: "Hindi" },
  { code: "te", label: "తెలుగు", englishName: "Telugu" },
  { code: "ta", label: "தமிழ்", englishName: "Tamil" },
  { code: "kn", label: "ಕನ್ನಡ", englishName: "Kannada" },
  { code: "ml", label: "മലയാളം", englishName: "Malayalam" },
  { code: "mr", label: "मराठी", englishName: "Marathi" },
  { code: "bn", label: "বাংলা", englishName: "Bengali" },
  { code: "gu", label: "ગુજરાતી", englishName: "Gujarati" },
  { code: "pa", label: "ਪੰਜਾਬੀ", englishName: "Punjabi" },
  { code: "or", label: "ଓଡ଼ିଆ", englishName: "Odia" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

const localeLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  hi: () => import("./locales/hi.json"),
  te: () => import("./locales/te.json"),
  ta: () => import("./locales/ta.json"),
  kn: () => import("./locales/kn.json"),
  ml: () => import("./locales/ml.json"),
  mr: () => import("./locales/mr.json"),
  bn: () => import("./locales/bn.json"),
  gu: () => import("./locales/gu.json"),
  pa: () => import("./locales/pa.json"),
  or: () => import("./locales/or.json"),
};

export async function loadLanguageResources(lang: string): Promise<boolean> {
  if (lang === "en" || i18n.hasResourceBundle(lang, "translation")) {
    return true;
  }
  const loader = localeLoaders[lang];
  if (!loader) return false;
  try {
    const mod = await loader();
    i18n.addResourceBundle(lang, "translation", mod.default, true, true);
    return true;
  } catch (err) {
    console.error(`[i18n] Failed to load locale bundle for "${lang}":`, err);
    return false;
  }
}

export async function setAppLanguage(lang: string): Promise<void> {
  await loadLanguageResources(lang);
  await i18n.changeLanguage(lang);
  prefs.setLanguage(lang);
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

// Transparently ensure resource bundle is loaded when i18n.changeLanguage is invoked directly
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = (async (...args: Parameters<typeof originalChangeLanguage>) => {
  const [lng] = args;
  if (lng && lng !== "en" && !i18n.hasResourceBundle(lng, "translation")) {
    await loadLanguageResources(lng);
  }
  return (originalChangeLanguage as (...a: unknown[]) => Promise<unknown>)(...args);
}) as typeof i18n.changeLanguage;

export default i18n;
