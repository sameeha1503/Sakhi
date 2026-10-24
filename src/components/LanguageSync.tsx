import { useEffect } from "react";
import i18n, { loadLanguageResources } from "@/i18n";
import { prefs } from "@/services/auth";

export function LanguageSync() {
  useEffect(() => {
    const l = prefs.language();
    if (l && l !== i18n.language) {
      loadLanguageResources(l).then(() => {
        i18n.changeLanguage(l);
      });
    }
    document.documentElement.lang = l ?? i18n.language ?? "en";

    const handler = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, []);
  return null;
}
