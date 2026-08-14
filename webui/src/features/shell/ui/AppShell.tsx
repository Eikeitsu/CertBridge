import { Outlet } from "react-router-dom";
import { useAppSelector } from "@/app/store/hooks";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import { useImmersiveChrome } from "@/features/shell/hooks/useImmersiveChrome";
import {
  selectBarBlurEnabled,
  selectResolvedTheme,
  selectThemePack,
} from "@/features/theme/model/selectors";
import { selectDeviceLabel } from "@/features/status/model/selectors";
import { getPackVoice } from "@/shared/config/packVoice";
import { TABS } from "@/shared/config/navigation";
import { AppTopbar } from "./AppTopbar";
import { AppDock } from "./AppDock";

export function AppShell() {
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const themePack = useAppSelector(selectThemePack);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isBarBlurEnabled = useAppSelector(selectBarBlurEnabled);
  const { activeTab, pathname, switchTab } = useActiveTab();
  const voice = getPackVoice(themePack);
  const pageTitle = TABS.find((tab) => tab.key === activeTab)?.label ?? voice.topbarBrand;

  useImmersiveChrome(resolvedTheme, isBarBlurEnabled, themePack, pathname);

  return (
    <div className={`app-shell pack-${themePack}`} data-shell-pack={themePack}>
      <AppTopbar
        pack={themePack}
        brandTitle={voice.topbarBrand}
        pageTitle={pageTitle}
        kicker={voice.topbarKicker}
        deviceLabel={deviceLabel}
      />
      <main className="app-main">
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <AppDock activeTab={activeTab} onSwitch={switchTab} />
    </div>
  );
}
