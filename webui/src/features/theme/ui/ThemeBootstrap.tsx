import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { hydrateTheme, refreshSystemTheme } from "@/features/theme/model/themeSlice";
import {
  bootstrapStatus,
  enrichBootstrapMeta,
} from "@/features/status/model/statusSlice";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { fetchActivityLog } from "@/features/log/model/logSlice";
import { resolveUiLang, type UiLangPref } from "@/shared/i18n";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { writeStorage } from "@/shared/lib/storage";

function deferIdle(fn: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => fn(), { timeout: 2500 });
    return;
  }
  window.setTimeout(fn, 600);
}

function applyDocumentLang(lng: "zh-CN" | "en") {
  document.documentElement.lang = lng === "zh-CN" ? "zh-CN" : "en";
}

export function ThemeBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();
  const status = useAppSelector(selectModuleStatus);

  useEffect(() => {
    dispatch(hydrateTheme());
    // 先拉 status 进页；设备名 / 自定义列表 / 日志后台补
    void dispatch(bootstrapStatus()).finally(() => {
      void dispatch(enrichBootstrapMeta());
    });
    deferIdle(() => {
      void dispatch(fetchActivityLog());
    });
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handleSchemeChange = () => dispatch(refreshSystemTheme());
    mediaQuery?.addEventListener("change", handleSchemeChange);
    return () => mediaQuery?.removeEventListener("change", handleSchemeChange);
  }, [dispatch]);

  // status 带回模块语言偏好时对齐一次（与本地缓存不一致才切，避免二次全量刷新）
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
