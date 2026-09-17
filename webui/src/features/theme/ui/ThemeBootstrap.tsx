import { useEffect, type ReactNode } from "react";
import { useAppDispatch } from "@/app/store/hooks";
import { hydrateTheme, refreshSystemTheme } from "@/features/theme/model/themeSlice";
import { bootstrapStatus } from "@/features/status/model/statusSlice";
import { fetchActivityLog } from "@/features/log/model/logSlice";

export function ThemeBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrateTheme());
    void dispatch(bootstrapStatus()).then(() => {
      void dispatch(fetchActivityLog());
    });
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handleSchemeChange = () => dispatch(refreshSystemTheme());
    mediaQuery?.addEventListener("change", handleSchemeChange);
    return () => mediaQuery?.removeEventListener("change", handleSchemeChange);
  }, [dispatch]);

  return children;
}
