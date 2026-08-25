import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import { useVisibleTabs } from "@/features/shell/hooks/useVisibleTabs";
import { useImmersiveChrome } from "@/features/shell/hooks/useImmersiveChrome";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { selectResolvedTheme, selectThemePack } from "@/features/theme/model/selectors";
import {
  selectDeviceLabel,
  selectModuleStatus,
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
  const status = useAppSelector(selectModuleStatus);
  const isRefreshing = useAppSelector(selectStatusRefreshing);
  const themePack = useAppSelector(selectThemePack);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab } = useActiveTab();
  const { tabs, hideSupported } = useVisibleTabs();
  const { voice } = usePackVoice();
  const [seen, setSeen] = useState<Partial<Record<TabName, boolean>>>(() => ({
    [activeTab]: true,
  }));

  useImmersiveChrome(resolvedTheme, false, themePack, "/");

  const visibleTabs = useMemo(
    () =>
      tabs.map((tab) => ({
        key: tab.key,
        label: voice.tabs[tab.key],
      })),
    [tabs, voice],
  );

  useEffect(() => {
    setSeen((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  useEffect(() => {
    if (!hideSupported && activeTab === TabName.Hide) {
      switchTab(TabName.Home);
    }
  }, [hideSupported, activeTab, switchTab]);

  return (
    <div className="cb-shell" data-shell-pack={themePack}>
      <AppProgressBar active={isRefreshing} />
      <AppTopbar
        pack={themePack}
        brand={voice.brand}
        pageTitle={voice.tabs[activeTab]}
        deviceLabel={deviceLabel}
        versionLabel={status.version}
        showBrand={voice.topbar.showBrand}
        showDevice={voice.topbar.showDevice}
      />
      <main className="cb-main">
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
        {hideSupported ? (
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
      <AppDock
        pack={themePack}
        activeTab={activeTab}
        onSwitch={switchTab}
        tabs={visibleTabs}
      />
      <AppSnackbar />
      <ConfirmHost />
    </div>
  );
}
