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
  selectStatusLoading,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { TabName } from "@/entities/module/enums";
import { AppSnackbar } from "@/shared/ui/AppSnackbar";
import { ConfirmHost } from "@/shared/ui/ConfirmHost";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";
import { TabPane, TabPendingOverlay } from "@/features/shell/ui/TabPane";
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
  const resolved = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab, mounted, tabPending } = useActiveTab();
  const { tabs, showHideTab } = useVisibleTabs();
  const v = chrome;

  useImmersiveChrome(resolved, false, undefined, "/");

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
        <TabPendingOverlay show={tabPending} />
        <TabPane
          active={activeTab === TabName.Home}
          mounted={!!mounted[TabName.Home]}
          className="pk-ops-pane"
        >
          <OpsHomePage />
        </TabPane>
        <TabPane
          active={activeTab === TabName.Certs}
          mounted={!!mounted[TabName.Certs]}
          className="pk-ops-pane"
        >
          <OpsCertsPage />
        </TabPane>
        <TabPane
          active={activeTab === TabName.Log}
          mounted={!!mounted[TabName.Log]}
          className="pk-ops-pane"
        >
          <OpsLogPage />
        </TabPane>
        {showHideTab ? (
          <TabPane
            active={activeTab === TabName.Hide}
            mounted={!!mounted[TabName.Hide]}
            className="pk-ops-pane"
          >
            <OpsHidePage />
          </TabPane>
        ) : null}
        <TabPane
          active={activeTab === TabName.More}
          mounted={!!mounted[TabName.More]}
          className="pk-ops-pane"
        >
          <OpsMorePage />
        </TabPane>
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
