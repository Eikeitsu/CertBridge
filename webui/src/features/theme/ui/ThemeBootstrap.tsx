import { useEffect, type ReactNode } from "react";
import { useAppDispatch } from "@/app/store/hooks";
import { hydrateTheme, refreshSystemTheme } from "@/features/theme/model/themeSlice";
import { bootstrapStatus } from "@/features/status/model/statusSlice";
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
    void dispatch(bootstrapStatus());
    // 日志非首屏关键路径，空闲后再拉，减轻启动争用
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
