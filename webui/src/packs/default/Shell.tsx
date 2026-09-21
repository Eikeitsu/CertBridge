import { useEffect, useMemo, useState } from "react";
import { Home, Shield, ScrollText, EyeOff, Ellipsis } from "lucide-react";
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
import { brandModuleIconSrc } from "@/shared/config/brand";
import { AppSnackbar } from "@/shared/ui/AppSnackbar";
import { ConfirmHost } from "@/shared/ui/ConfirmHost";
import { DEFAULT_VOICE } from "./voice";
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

function Pane({
  tab,
  active,
  seen,
  children,
}: {
  tab: TabName;
  active: TabName;
  seen: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`pk-def-pane${active === tab ? " is-on" : ""}`}
      aria-hidden={active !== tab}
    >
      {seen ? children : null}
    </section>
  );
}

export function DefaultShell() {
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const refreshing = useAppSelector(selectStatusRefreshing);
  const loading = useAppSelector(selectStatusLoading);
  const resolved = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab } = useActiveTab();
  const { tabs, showHideTab } = useVisibleTabs();
  const v = DEFAULT_VOICE;
  const [seen, setSeen] = useState<Partial<Record<TabName, boolean>>>(() => ({
    [activeTab]: true,
  }));

  useImmersiveChrome(resolved, false, undefined, "/");

  useEffect(() => {
    setSeen((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

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
        <Pane tab={TabName.Home} active={activeTab} seen={!!seen[TabName.Home]}>
          <DefaultHomePage />
        </Pane>
        <Pane tab={TabName.Certs} active={activeTab} seen={!!seen[TabName.Certs]}>
          <DefaultCertsPage />
        </Pane>
        <Pane tab={TabName.Log} active={activeTab} seen={!!seen[TabName.Log]}>
          <DefaultLogPage />
        </Pane>
        {showHideTab ? (
          <Pane tab={TabName.Hide} active={activeTab} seen={!!seen[TabName.Hide]}>
            <DefaultHidePage />
          </Pane>
        ) : null}
        <Pane tab={TabName.More} active={activeTab} seen={!!seen[TabName.More]}>
          <DefaultMorePage />
        </Pane>
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
