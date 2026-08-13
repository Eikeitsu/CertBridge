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
import { ThemePack } from "@/entities/module/enums";
import { AppTopbar } from "./AppTopbar";
import { AppDock } from "./AppDock";

export function AppShell() {
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const themePack = useAppSelector(selectThemePack);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isBarBlurEnabled = useAppSelector(selectBarBlurEnabled);
  const { activeTab, pathname, switchTab } = useActiveTab();
  const isMaterial = themePack === ThemePack.Material;

  useImmersiveChrome(resolvedTheme, isBarBlurEnabled, themePack, pathname);

  return (
    <div
      className={`app-shell pack-${themePack}${isMaterial ? " shell-md3" : ""}`}
      data-shell-pack={themePack}
    >
      <AppTopbar isMaterial={isMaterial} deviceLabel={deviceLabel} />
      <main className="app-main">
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <AppDock activeTab={activeTab} onSwitch={switchTab} />
    </div>
  );
}
