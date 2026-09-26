import { useEffect, useMemo } from "react";
import { Home, Shield, ScrollText, EyeOff, Ellipsis } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppSelector } from "@/app/store/hooks";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import { useVisibleTabs } from "@/features/shell/hooks/useVisibleTabs";
import { useImmersiveChrome } from "@/features/shell/hooks/useImmersiveChrome";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import {
  selectDeviceLabel,
  selectStatusBootstrapped,
  selectStatusLoading,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { TabName } from "@/entities/module/enums";
import { brandModuleIconSrc } from "@/shared/config/brand";
import { AppSnackbar } from "@/shared/ui/AppSnackbar";
import { ConfirmHost } from "@/shared/ui/ConfirmHost";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";
import { DeferredTabPane } from "@/features/shell/ui/DeferredTabPane";
import { DefaultHomePage } from "./pages/HomePage";
import { DefaultCertsPage } from "./pages/CertsPage";
import { DefaultLogPage } from "./pages/LogPage";
import { DefaultHidePage } from "./pages/HidePage";
import { DefaultMorePage } from "./pages/MorePage";

const ICONS: Record<TabName, LucideIcon> = {
  [TabName.Home]: Home,
  [TabName.Certs]: Shield,
  [TabName.Log]: ScrollText,
  [TabName.Hide]: EyeOff,
  [TabName.More]: Ellipsis,
};

export function DefaultShell() {
  const chrome = usePackChrome();
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const refreshing = useAppSelector(selectStatusRefreshing);
  const loading = useAppSelector(selectStatusLoading);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const resolved = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab, seen, prewarmTabs } = useActiveTab();
  const { tabs, showHideTab } = useVisibleTabs();
  const v = chrome;

  useImmersiveChrome(resolved, false, undefined, "/");

  useEffect(() => {
    if (!bootstrapped) return;
    const t = window.setTimeout(() => prewarmTabs(), 1200);
    return () => window.clearTimeout(t);
  }, [bootstrapped, prewarmTabs]);

  useEffect(() => {
    if (!showHideTab && activeTab === TabName.Hide) switchTab(TabName.Home);
  }, [showHideTab, activeTab, switchTab]);

  const dockTabs = useMemo(
    () => tabs.map((t) => ({ key: t.key, label: v.tabs[t.key] })),
    [tabs, v.tabs],
  );

  return (
    <div className="pk-def-shell">
      <div
        className={`pk-def-progress${refreshing || loading ? " is-on" : ""}`}
        aria-hidden
      />
      <header className="pk-def-topbar">
        <div className="pk-def-topbar__brand">
          <img
            className="pk-def-topbar__mark"
            src={brandModuleIconSrc()}
            alt=""
            width={22}
            height={22}
          />
          <strong>{v.brand}</strong>
        </div>
        <div className="pk-def-topbar__device">{deviceLabel}</div>
      </header>
      <main className="pk-def-main">
        <DeferredTabPane
          active={activeTab === TabName.Home}
          seen={!!seen[TabName.Home]}
          className="pk-def-pane"
        >
          <DefaultHomePage />
        </DeferredTabPane>
        <DeferredTabPane
          active={activeTab === TabName.Certs}
          seen={!!seen[TabName.Certs]}
          className="pk-def-pane"
        >
          <DefaultCertsPage />
        </DeferredTabPane>
        <DeferredTabPane
          active={activeTab === TabName.Log}
          seen={!!seen[TabName.Log]}
          className="pk-def-pane"
        >
          <DefaultLogPage />
        </DeferredTabPane>
        {showHideTab ? (
          <DeferredTabPane
            active={activeTab === TabName.Hide}
            seen={!!seen[TabName.Hide]}
            className="pk-def-pane"
          >
            <DefaultHidePage />
          </DeferredTabPane>
        ) : null}
        <DeferredTabPane
          active={activeTab === TabName.More}
          seen={!!seen[TabName.More]}
          className="pk-def-pane"
        >
          <DefaultMorePage />
        </DeferredTabPane>
      </main>
      <nav
        className="pk-def-dock"
        style={{ gridTemplateColumns: `repeat(${dockTabs.length}, 1fr)` }}
      >
        {dockTabs.map((tab) => {
          const Icon = ICONS[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              className={`pk-def-dock__item${activeTab === tab.key ? " is-on" : ""}`}
              onClick={() => switchTab(tab.key)}
            >
              <span className="pk-def-dock__icon">
                <Icon strokeWidth={activeTab === tab.key ? 2.4 : 1.8} />
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <AppSnackbar />
      <ConfirmHost />
    </div>
  );
}
