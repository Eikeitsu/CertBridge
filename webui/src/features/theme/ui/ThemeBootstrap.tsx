import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { hydrateTheme, refreshSystemTheme } from "@/features/theme/model/themeSlice";
import {
  bootstrapStatus,
  enrichBootstrapMeta,
} from "@/features/status/model/statusSlice";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { resolveUiLang, type UiLangPref } from "@/shared/i18n";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { writeStorage } from "@/shared/lib/storage";

function applyDocumentLang(lng: "zh-CN" | "en") {
  document.documentElement.lang = lng === "zh-CN" ? "zh-CN" : "en";
}

export function ThemeBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();
  const status = useAppSelector(selectModuleStatus);

  useEffect(() => {
    dispatch(hydrateTheme());
    // 首屏 quick；证书列表后台补。完整 status 改由隐藏页按需拉取，避免堵首次切 Tab
    void dispatch(bootstrapStatus()).finally(() => {
      void dispatch(enrichBootstrapMeta());
    });
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handleSchemeChange = () => dispatch(refreshSystemTheme());
    mediaQuery?.addEventListener("change", handleSchemeChange);
    return () => mediaQuery?.removeEventListener("change", handleSchemeChange);
  }, [dispatch]);

  useEffect(() => {
    const raw = (status.ui_lang as UiLangPref) || "";
    if (!raw) return;
    if (raw !== "system" && raw !== "zh-CN" && raw !== "en") return;
    writeStorage(STORAGE_KEYS.uiLang, raw);
    const resolved = (status.ui_lang_resolved as "zh-CN" | "en") || resolveUiLang(raw);
    const cur = i18n.resolvedLanguage || i18n.language;
    if (cur === resolved) {
      applyDocumentLang(resolved);
      return;
    }
    void i18n.changeLanguage(resolved);
    applyDocumentLang(resolved);
  }, [status.ui_lang, status.ui_lang_resolved, i18n]);

  return children;
}
