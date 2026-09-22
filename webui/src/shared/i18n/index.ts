import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhWebui from "@locales/zh-CN/webui.json";
import enWebui from "@locales/en/webui.json";
import zhCommon from "@locales/zh-CN/common.json";
import enCommon from "@locales/en/common.json";

export type UiLangPref = "system" | "zh-CN" | "en";

export function normalizeBrowserLang(raw?: string | null): "zh-CN" | "en" {
  const v = (raw || "").toLowerCase().replace(/_/g, "-");
  if (v.startsWith("zh")) return "zh-CN";
  if (v.startsWith("en")) return "en";
  return "en";
}

export function resolveUiLang(
  pref: UiLangPref,
  browser = navigator.language,
): "zh-CN" | "en" {
  if (pref === "zh-CN") return "zh-CN";
  if (pref === "en") return "en";
  return normalizeBrowserLang(browser);
}

void i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { webui: zhWebui, common: zhCommon },
    en: { webui: enWebui, common: enCommon },
  },
  lng: resolveUiLang("system"),
  fallbackLng: "en",
  defaultNS: "webui",
  ns: ["webui", "common"],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
