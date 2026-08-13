import { useEffect, type ReactNode } from "react";
import { ConfigProvider } from "antd-mobile";
import zhCN from "antd-mobile/es/locales/zh-CN";
import { Provider } from "react-redux";
import { store } from "@/app/store";
import { useAppDispatch } from "@/app/store/hooks";
import { hydrateTheme, refreshSystemTheme } from "@/features/theme/model/themeSlice";
import { bootstrapStatus } from "@/features/status/model/statusSlice";
import { fetchActivityLog } from "@/features/log/model/logSlice";

function ThemeBridge({ children }: { children: ReactNode }) {
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

  return <ConfigProvider locale={zhCN}>{children}</ConfigProvider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeBridge>{children}</ThemeBridge>
    </Provider>
  );
}
