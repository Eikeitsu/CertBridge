import { useEffect, useMemo } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import { useVisibleTabs } from "@/features/shell/hooks/useVisibleTabs";
import { useImmersiveChrome } from "@/features/shell/hooks/useImmersiveChrome";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import {
  selectDeviceLabel,
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
import { TabPendingOverlay } from "./TabPane";

export function AppShell() {
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const isRefreshing = useAppSelector(selectStatusRefreshing);
  const isLoading = useAppSelector(selectStatusLoading);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab, mounted, tabPending } = useActiveTab();
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
        <TabPendingOverlay show={tabPending} />
        <AppTabPane
          tab={TabName.Home}
          activeTab={activeTab}
          mounted={!!mounted[TabName.Home]}
        >
          <OverviewPage />
        </AppTabPane>
        <AppTabPane
          tab={TabName.Certs}
          activeTab={activeTab}
          mounted={!!mounted[TabName.Certs]}
        >
          <CertsPage />
        </AppTabPane>
        <AppTabPane
          tab={TabName.Log}
          activeTab={activeTab}
          mounted={!!mounted[TabName.Log]}
        >
          <LogPage />
        </AppTabPane>
        {showHideTab ? (
          <AppTabPane
            tab={TabName.Hide}
            activeTab={activeTab}
            mounted={!!mounted[TabName.Hide]}
          >
            <HidePage />
          </AppTabPane>
        ) : null}
        <AppTabPane
          tab={TabName.More}
          activeTab={activeTab}
          mounted={!!mounted[TabName.More]}
        >
          <SettingsPage />
        </AppTabPane>
      </main>
      <AppDock activeTab={activeTab} onSwitch={switchTab} tabs={visibleTabs} />
      <AppSnackbar />
      <ConfirmHost />
    </div>
  );
}
