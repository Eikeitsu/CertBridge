import { useEffect, useState } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import { useImmersiveChrome } from "@/features/shell/hooks/useImmersiveChrome";
import { selectResolvedTheme, selectThemePack } from "@/features/theme/model/selectors";
import {
  selectDeviceLabel,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { TabName } from "@/entities/module/enums";
import { TABS } from "@/shared/config/navigation";
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

const TAB_LABEL: Record<TabName, string> = Object.fromEntries(
  TABS.map((tab) => [tab.key, tab.label]),
) as Record<TabName, string>;

export function AppShell() {
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const isRefreshing = useAppSelector(selectStatusRefreshing);
  const themePack = useAppSelector(selectThemePack);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab } = useActiveTab();
  const [seen, setSeen] = useState<Partial<Record<TabName, boolean>>>(() => ({
    [activeTab]: true,
  }));

  useImmersiveChrome(resolvedTheme, false, themePack, "/");

  useEffect(() => {
    setSeen((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  return (
    <div className="cb-shell" data-shell-pack={themePack}>
      <AppProgressBar active={isRefreshing} />
      <AppTopbar pageTitle={TAB_LABEL[activeTab]} deviceLabel={deviceLabel} />
      <main className="cb-main">
        <AppTabPane tab={TabName.Home} activeTab={activeTab} seen={!!seen[TabName.Home]}>
          <OverviewPage />
        </AppTabPane>
        <AppTabPane tab={TabName.Certs} activeTab={activeTab} seen={!!seen[TabName.Certs]}>
          <CertsPage />
        </AppTabPane>
        <AppTabPane tab={TabName.Log} activeTab={activeTab} seen={!!seen[TabName.Log]}>
          <LogPage />
        </AppTabPane>
        <AppTabPane tab={TabName.Hide} activeTab={activeTab} seen={!!seen[TabName.Hide]}>
          <HidePage />
        </AppTabPane>
        <AppTabPane tab={TabName.More} activeTab={activeTab} seen={!!seen[TabName.More]}>
          <SettingsPage />
        </AppTabPane>
      </main>
      <AppDock activeTab={activeTab} onSwitch={switchTab} />
      <AppSnackbar />
      <ConfirmHost />
    </div>
  );
}
