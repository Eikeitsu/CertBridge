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
import { syncChromeBars } from "@/features/theme/lib/chrome";
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
  const isMaterialPack = themePack === "material";

  useEffect(() => {
    syncChromeBars(resolvedTheme, isBarBlurEnabled);
  }, [resolvedTheme, isBarBlurEnabled, pathname]);

  return (
    <div className={`app-shell pack-${themePack}`}>
      <header className="app-topbar">
        {!isMaterialPack && (
          <img className="logo" src={`${import.meta.env.BASE_URL}img/icon.png`} alt="" />
        )}
        <div className="titles">
          {isMaterialPack && <p className="eyebrow">{deviceLabel}</p>}
          <h1>证书桥</h1>
          {!isMaterialPack && <p>{deviceLabel}</p>}
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
