import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { hydrateTheme, refreshSystemTheme } from "@/features/theme/model/themeSlice";
import {
  bootstrapStatus,
  enrichBootstrapMeta,
  enrichFullStatus,
} from "@/features/status/model/statusSlice";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { resolveUiLang, type UiLangPref } from "@/shared/i18n";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { writeStorage } from "@/shared/lib/storage";

function deferIdle(fn: () => void, timeout = 2500) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => fn(), { timeout });
    return;
  }
  window.setTimeout(fn, Math.min(600, timeout));
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
    // 首屏：status --quick → 立刻可交互；设备名/证书列表后台补；完整 status 再延后
    void dispatch(bootstrapStatus()).finally(() => {
      void dispatch(enrichBootstrapMeta());
      // 完整 status 再延后，避免与首次切 Tab / 预热抢主线程与桥
      deferIdle(() => {
        void dispatch(enrichFullStatus());
      }, 8000);
    });
    // 日志改由日志页挂载后再拉，避免与 enrich 抢桥导致切 Tab 卡住
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
