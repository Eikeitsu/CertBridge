import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhWebui from "@locales/zh-CN/webui.json";
import enWebui from "@locales/en/webui.json";
import zhCommon from "@locales/zh-CN/common.json";
import enCommon from "@locales/en/common.json";
import zhErrors from "@locales/zh-CN/errors.json";
import enErrors from "@locales/en/errors.json";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { readStorage } from "@/shared/lib/storage";

export type UiLangPref = "system" | "zh-CN" | "en";

export function normalizeBrowserLang(raw?: string | null): "zh-CN" | "en" {
  const v = (raw || "").toLowerCase().replace(/_/g, "-");
  if (v.startsWith("zh")) return "zh-CN";
  if (v.startsWith("en")) return "en";
  return "en";
}

export function resolveUiLang(
  pref: UiLangPref,
  browser = typeof navigator !== "undefined" ? navigator.language : "en",
): "zh-CN" | "en" {
  if (pref === "zh-CN") return "zh-CN";
  if (pref === "en") return "en";
  return normalizeBrowserLang(browser);
}

function readStoredLangPref(): UiLangPref {
  const raw = readStorage(STORAGE_KEYS.uiLang);
  if (raw === "system" || raw === "zh-CN" || raw === "en") return raw;
  return "system";
}

/** 首屏用本地偏好，避免先按浏览器语言渲染再被 status 打回造成二次全量刷新 */
const initialPref = readStoredLangPref();
const initialLng = resolveUiLang(initialPref);

void i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { webui: zhWebui, common: zhCommon, errors: zhErrors },
    en: { webui: enWebui, common: enCommon, errors: enErrors },
  },
  lng: initialLng,
  fallbackLng: "en",
  defaultNS: "webui",
  ns: ["webui", "common", "errors"],
  interpolation: { escapeValue: false },
  returnNull: false,
  // Magisk WebView：关 Suspense，避免切语言/缺 key 时挂起白屏
  react: {
    useSuspense: false,
    bindI18n: "languageChanged",
    bindI18nStore: false,
  },
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLng === "zh-CN" ? "zh-CN" : "en";
}

export default i18n;
