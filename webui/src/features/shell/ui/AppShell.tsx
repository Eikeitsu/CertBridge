import { useEffect, useMemo } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import { useVisibleTabs } from "@/features/shell/hooks/useVisibleTabs";
import { useImmersiveChrome } from "@/features/shell/hooks/useImmersiveChrome";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import {
  selectDeviceLabel,
  selectStatusBootstrapped,
  selectStatusLoading,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { TabName } from "@/entities/module/enums";
import { OverviewPage } from "@/features/overview/ui/OverviewPage";
import { CertsPage } from "@/features/certs/ui/CertsPage";
import { LogPage } from "@/features/log/ui/LogPage";
import { HidePage } from "@/features/hide/ui/HidePage";
import { SettingsPage } from "@/features/settings/ui/SettingsPage";
import { AppSnackbar } from "@/shared/ui/AppSnackbar";
import { ConfirmHost } from "@/shared/ui/ConfirmHost";
import { AppTopbar } from "./AppTopbar";
import { AppProgressBar } from "./AppProgressBar";
import { AppDock } from "./AppDock";
import { AppTabPane } from "./AppTabPane";

export function AppShell() {
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const isRefreshing = useAppSelector(selectStatusRefreshing);
  const isLoading = useAppSelector(selectStatusLoading);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab, seen, prewarmTabs } = useActiveTab();
  const { tabs, showHideTab } = useVisibleTabs();
  const { voice } = usePackVoice();

  useImmersiveChrome(resolvedTheme, false, undefined, "/");

  const visibleTabs = useMemo(
    () =>
      tabs.map((tab) => ({
        key: tab.key,
        label: voice.tabs[tab.key],
      })),
    [tabs, voice],
  );

  // 首屏可交互后再预热其它 Tab，避免第一次点击才挂重树
  useEffect(() => {
    if (!bootstrapped) return;
    const t = window.setTimeout(() => prewarmTabs(), 1200);
    return () => window.clearTimeout(t);
  }, [bootstrapped, prewarmTabs]);

  useEffect(() => {
    if (!showHideTab && activeTab === TabName.Hide) switchTab(TabName.Home);
  }, [showHideTab, activeTab, switchTab]);

  return (
    <div className="bf-shell">
      <AppProgressBar active={isRefreshing || isLoading} />
      <AppTopbar
        brand={voice.brand}
        pageTitle={voice.tabs[activeTab]}
        deviceLabel={deviceLabel}
        showBrand={voice.topbar.showBrand}
        showDevice={voice.topbar.showDevice}
      />
      <main className="bf-main">
        <AppTabPane tab={TabName.Home} activeTab={activeTab} seen={!!seen[TabName.Home]}>
          <OverviewPage />
        </AppTabPane>
        <AppTabPane
          tab={TabName.Certs}
          activeTab={activeTab}
          seen={!!seen[TabName.Certs]}
        >
          <CertsPage />
        </AppTabPane>
        <AppTabPane tab={TabName.Log} activeTab={activeTab} seen={!!seen[TabName.Log]}>
          <LogPage />
        </AppTabPane>
        {showHideTab ? (
          <AppTabPane
            tab={TabName.Hide}
            activeTab={activeTab}
            seen={!!seen[TabName.Hide]}
          >
            <HidePage />
          </AppTabPane>
        ) : null}
        <AppTabPane tab={TabName.More} activeTab={activeTab} seen={!!seen[TabName.More]}>
          <SettingsPage />
        </AppTabPane>
      </main>
      <AppDock activeTab={activeTab} onSwitch={switchTab} tabs={visibleTabs} />
      <AppSnackbar />
      <ConfirmHost />
    </div>
  );
}
