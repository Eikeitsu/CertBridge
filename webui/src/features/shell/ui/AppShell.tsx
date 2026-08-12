import { useEffect, type ReactNode } from "react";
import {
  SafetyCertificateOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Outlet } from "react-router-dom";
import { useAppSelector } from "@/app/store/hooks";
import { TABS } from "@/shared/config/navigation";
import type { TabName } from "@/entities/module/types";
import { pinSafeInsets, syncChromeBars } from "@/features/theme/lib/chrome";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import {
  selectBarBlurEnabled,
  selectResolvedTheme,
  selectThemePack,
} from "@/features/theme/model/selectors";
import { selectDeviceLabel } from "@/features/status/model/selectors";

const TAB_ICONS: Record<TabName, ReactNode> = {
  home: <SafetyCertificateOutlined />,
  certs: <AppstoreOutlined />,
  log: <FileTextOutlined />,
  more: <UserOutlined />,
};

export function AppShell() {
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const themePack = useAppSelector(selectThemePack);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isBarBlurEnabled = useAppSelector(selectBarBlurEnabled);
  const { activeTab, pathname, switchTab } = useActiveTab();

  useEffect(() => {
    pinSafeInsets(true);
    syncChromeBars(resolvedTheme, isBarBlurEnabled);
    const frame = requestAnimationFrame(() => {
      syncChromeBars(resolvedTheme, isBarBlurEnabled);
    });
    const t1 = window.setTimeout(
      () => syncChromeBars(resolvedTheme, isBarBlurEnabled),
      120,
    );
    const t2 = window.setTimeout(
      () => syncChromeBars(resolvedTheme, isBarBlurEnabled),
      400,
    );
    const onResume = () => {
      pinSafeInsets(true);
      syncChromeBars(resolvedTheme, isBarBlurEnabled);
    };
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [resolvedTheme, isBarBlurEnabled, pathname, themePack]);

  return (
    <div className={`app-shell pack-${themePack}`} data-shell-pack={themePack}>
      <header className="app-topbar">
        {themePack !== "material" && (
          <img className="logo" src={`${import.meta.env.BASE_URL}img/icon.png`} alt="" />
        )}
        <div className="titles">
          {themePack === "material" && <p className="eyebrow">{deviceLabel}</p>}
          <h1>证书桥</h1>
          {themePack !== "material" && <p>{deviceLabel}</p>}
        </div>
      </header>

      <main className="app-main">
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <nav className="app-dock" aria-label="主导航">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeTab === item.key ? "active" : undefined}
            onClick={() => switchTab(item.key)}
          >
            {TAB_ICONS[item.key]}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
