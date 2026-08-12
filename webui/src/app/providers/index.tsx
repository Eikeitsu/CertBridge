import { useEffect, useMemo, type ReactNode } from "react";
import { ConfigProvider, App as AntApp, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { Provider } from "react-redux";
import { store } from "@/app/store";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { hydrateTheme, refreshSystemTheme } from "@/features/theme/model/themeSlice";
import { bootstrapStatus } from "@/features/status/model/statusSlice";
import { fetchActivityLog } from "@/features/log/model/logSlice";
import {
  selectAccentId,
  selectIsCompact,
  selectIsMonetEnabled,
  selectResolvedTheme,
  selectThemePack,
} from "@/features/theme/model/selectors";
import { ACCENTS } from "@/shared/config/paths";

function ThemeBridge({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isCompact = useAppSelector(selectIsCompact);
  const accentId = useAppSelector(selectAccentId);
  const themePack = useAppSelector(selectThemePack);
  const isMonetEnabled = useAppSelector(selectIsMonetEnabled);
  const primaryColor = useMemo(() => {
    const fallbackColor =
      ACCENTS.find((accent) => accent.id === accentId)?.color ||
      (resolvedTheme === "dark" ? "#2DD4BF" : "#0F766E");
    if (isMonetEnabled && (themePack === "fluid" || themePack === "material")) {
      const monetColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--cb-primary")
        .trim();
      return monetColor || fallbackColor;
    }
    return fallbackColor;
  }, [accentId, isMonetEnabled, themePack, resolvedTheme]);

  const packRadius = useMemo(() => {
    if (themePack === "material") return isCompact ? 8 : 12;
    if (themePack === "fluid") return isCompact ? 16 : 20;
    return isCompact ? 12 : 16;
  }, [themePack, isCompact]);

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

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: [
          resolvedTheme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          ...(isCompact ? [antdTheme.compactAlgorithm] : []),
        ],
        token: {
          colorPrimary: primaryColor,
          colorInfo: primaryColor,
          borderRadius: packRadius,
          fontFamily:
            '"Segoe UI", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
          colorBgContainer: resolvedTheme === "dark" ? "#171e26" : "#ffffff",
          colorBorder:
            resolvedTheme === "dark" ? "rgba(148,163,184,0.14)" : "rgba(15,23,42,0.08)",
        },
        components: {
          Segmented: {
            borderRadius: packRadius,
          },
          Button: {
            borderRadius: packRadius,
          },
        },
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeBridge>{children}</ThemeBridge>
    </Provider>
  );
}
