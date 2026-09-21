import { useEffect, type ReactNode } from "react";
import { useAppDispatch } from "@/app/store/hooks";
import { hydrateTheme, refreshSystemTheme } from "@/features/theme/model/themeSlice";
import {
  bootstrapStatus,
  enrichBootstrapMeta,
} from "@/features/status/model/statusSlice";
import { fetchActivityLog } from "@/features/log/model/logSlice";

function deferIdle(fn: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => fn(), { timeout: 2500 });
    return;
  }
  window.setTimeout(fn, 600);
}

export function ThemeBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

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

  return children;
}
