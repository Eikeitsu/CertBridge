import { useEffect, useMemo } from "react";
import { Activity, Shield, ScrollText, EyeOff, Ellipsis } from "lucide-react";
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
import { AppSnackbar } from "@/shared/ui/AppSnackbar";
import { ConfirmHost } from "@/shared/ui/ConfirmHost";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";
import { DeferredTabPane } from "@/features/shell/ui/DeferredTabPane";
import { OpsHomePage } from "./pages/HomePage";
import { OpsCertsPage } from "./pages/CertsPage";
import { OpsLogPage } from "./pages/LogPage";
import { OpsHidePage } from "./pages/HidePage";
import { OpsMorePage } from "./pages/MorePage";

const ICONS: Record<TabName, LucideIcon> = {
  [TabName.Home]: Activity,
  [TabName.Certs]: Shield,
  [TabName.Log]: ScrollText,
  [TabName.Hide]: EyeOff,
  [TabName.More]: Ellipsis,
};

export function OpsShell() {
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
    <div className="pk-ops-shell">
      <div
        className={`pk-ops-progress${refreshing || loading ? " is-on" : ""}`}
        aria-hidden
      />
      <header className="pk-ops-topbar">
        <div className="pk-ops-topbar__brand">
          <span className="pk-ops-topbar__mark" aria-hidden />
          <strong>{v.brand}</strong>
        </div>
        <div className="pk-ops-topbar__title">{v.tabs[activeTab]}</div>
        <div className="pk-ops-topbar__meta">{deviceLabel}</div>
      </header>
      <main className="pk-ops-main">
        <DeferredTabPane
          active={activeTab === TabName.Home}
          seen={!!seen[TabName.Home]}
          className="pk-ops-pane"
        >
          <OpsHomePage />
        </DeferredTabPane>
        <DeferredTabPane
          active={activeTab === TabName.Certs}
          seen={!!seen[TabName.Certs]}
          className="pk-ops-pane"
        >
          <OpsCertsPage />
        </DeferredTabPane>
        <DeferredTabPane
          active={activeTab === TabName.Log}
          seen={!!seen[TabName.Log]}
          className="pk-ops-pane"
        >
          <OpsLogPage />
        </DeferredTabPane>
        {showHideTab ? (
          <DeferredTabPane
            active={activeTab === TabName.Hide}
            seen={!!seen[TabName.Hide]}
            className="pk-ops-pane"
          >
            <OpsHidePage />
          </DeferredTabPane>
        ) : null}
        <DeferredTabPane
          active={activeTab === TabName.More}
          seen={!!seen[TabName.More]}
          className="pk-ops-pane"
        >
          <OpsMorePage />
        </DeferredTabPane>
      </main>
      <nav
        className="pk-ops-dock"
        style={{ gridTemplateColumns: `repeat(${dockTabs.length}, 1fr)` }}
      >
        {dockTabs.map((tab) => {
          const Icon = ICONS[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              className={`pk-ops-dock__item${activeTab === tab.key ? " is-on" : ""}`}
              onClick={() => switchTab(tab.key)}
            >
              <Icon size={18} strokeWidth={activeTab === tab.key ? 2.2 : 1.7} />
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
