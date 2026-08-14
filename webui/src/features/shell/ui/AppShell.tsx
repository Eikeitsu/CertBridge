import { useEffect, useState } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import { useImmersiveChrome } from "@/features/shell/hooks/useImmersiveChrome";
import {
  selectBarBlurEnabled,
  selectResolvedTheme,
  selectThemePack,
} from "@/features/theme/model/selectors";
import {
  selectDeviceLabel,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { getPackVoice } from "@/shared/config/packVoice";
import { TABS } from "@/shared/config/navigation";
import { TabName } from "@/entities/module/enums";
import { OverviewPage } from "@/features/overview";
import { CertsPage } from "@/features/certs";
import { LogPage } from "@/features/log";
import { SettingsPage } from "@/features/settings";
import { AppSnackbar } from "@/shared/ui/AppSnackbar";
import { AppTopbar } from "./AppTopbar";
import { AppDock } from "./AppDock";

export function AppShell() {
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const isRefreshing = useAppSelector(selectStatusRefreshing);
  const themePack = useAppSelector(selectThemePack);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isBarBlurEnabled = useAppSelector(selectBarBlurEnabled);
  const { activeTab, pathname, switchTab } = useActiveTab();
  const voice = getPackVoice(themePack);
  const pageTitle = TABS.find((tab) => tab.key === activeTab)?.label ?? voice.topbarBrand;
  const [seen, setSeen] = useState<Partial<Record<TabName, boolean>>>(() => ({
    [activeTab]: true,
  }));

  useImmersiveChrome(resolvedTheme, isBarBlurEnabled, themePack, pathname);

  useEffect(() => {
    setSeen((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
    const pane = document.querySelector(".app-pane.is-on");
    const focused = document.activeElement;
    if (
      pane instanceof HTMLElement &&
      focused instanceof HTMLElement &&
      !pane.contains(focused) &&
      focused !== document.body
    ) {
      focused.blur();
    }
  }, [activeTab]);

  return (
    <div className={`app-shell pack-${themePack}`} data-shell-pack={themePack}>
      <div className={`cb-progress${isRefreshing ? " is-on" : ""}`} aria-hidden />
      <AppTopbar
        pack={themePack}
        brandTitle={voice.topbarBrand}
        pageTitle={pageTitle}
        kicker={voice.topbarKicker}
        deviceLabel={deviceLabel}
      />
      <main className="app-main">
        <section
          className={`app-pane${activeTab === TabName.Home ? " is-on" : ""}`}
          aria-hidden={activeTab !== TabName.Home}
        >
          {seen[TabName.Home] ? <OverviewPage /> : null}
        </section>
        <section
          className={`app-pane${activeTab === TabName.Certs ? " is-on" : ""}`}
          aria-hidden={activeTab !== TabName.Certs}
        >
          {seen[TabName.Certs] ? <CertsPage /> : null}
        </section>
        <section
          className={`app-pane${activeTab === TabName.Log ? " is-on" : ""}`}
          aria-hidden={activeTab !== TabName.Log}
        >
          {seen[TabName.Log] ? <LogPage /> : null}
        </section>
        <section
          className={`app-pane${activeTab === TabName.More ? " is-on" : ""}`}
          aria-hidden={activeTab !== TabName.More}
        >
          {seen[TabName.More] ? <SettingsPage /> : null}
        </section>
      </main>
      <AppSnackbar />
      <AppDock activeTab={activeTab} onSwitch={switchTab} />
    </div>
  );
}
