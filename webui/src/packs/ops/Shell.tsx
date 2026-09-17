import { useEffect, useMemo, useState } from "react";
import { Activity, Shield, ScrollText, EyeOff, Ellipsis } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppSelector } from "@/app/store/hooks";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import { useVisibleTabs } from "@/features/shell/hooks/useVisibleTabs";
import { useImmersiveChrome } from "@/features/shell/hooks/useImmersiveChrome";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import {
  selectDeviceLabel,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { TabName } from "@/entities/module/enums";
import { AppSnackbar } from "@/shared/ui/AppSnackbar";
import { ConfirmHost } from "@/shared/ui/ConfirmHost";
import { OPS_VOICE } from "./voice";
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
    <section className={`pk-ops-pane${active === tab ? " is-on" : ""}`} aria-hidden={active !== tab}>
      {seen ? children : null}
    </section>
  );
}

export function OpsShell() {
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const refreshing = useAppSelector(selectStatusRefreshing);
  const resolved = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab } = useActiveTab();
  const { tabs, hideSupported } = useVisibleTabs();
  const v = OPS_VOICE;
  const [seen, setSeen] = useState<Partial<Record<TabName, boolean>>>(() => ({
    [activeTab]: true,
  }));

  useImmersiveChrome(resolved, false, undefined, "/");

  useEffect(() => {
    setSeen((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  useEffect(() => {
    if (!hideSupported && activeTab === TabName.Hide) switchTab(TabName.Home);
  }, [hideSupported, activeTab, switchTab]);

  const dockTabs = useMemo(
    () => tabs.map((t) => ({ key: t.key, label: v.tabs[t.key] })),
    [tabs, v.tabs],
  );

  return (
    <div className="pk-ops-shell">
      <div className={`pk-ops-progress${refreshing ? " is-on" : ""}`} aria-hidden />
      <header className="pk-ops-topbar">
        <div className="pk-ops-topbar__brand">
          <span className="pk-ops-topbar__mark" aria-hidden />
          <strong>{v.brand}</strong>
        </div>
        <div className="pk-ops-topbar__title">{v.tabs[activeTab]}</div>
        <div className="pk-ops-topbar__meta">{deviceLabel}</div>
      </header>
      <main className="pk-ops-main">
        <Pane tab={TabName.Home} active={activeTab} seen={!!seen[TabName.Home]}>
          <OpsHomePage />
        </Pane>
        <Pane tab={TabName.Certs} active={activeTab} seen={!!seen[TabName.Certs]}>
          <OpsCertsPage />
        </Pane>
        <Pane tab={TabName.Log} active={activeTab} seen={!!seen[TabName.Log]}>
          <OpsLogPage />
        </Pane>
        {hideSupported ? (
          <Pane tab={TabName.Hide} active={activeTab} seen={!!seen[TabName.Hide]}>
            <OpsHidePage />
          </Pane>
        ) : null}
        <Pane tab={TabName.More} active={activeTab} seen={!!seen[TabName.More]}>
          <OpsMorePage />
        </Pane>
      </main>
      <nav className="pk-ops-dock" style={{ gridTemplateColumns: `repeat(${dockTabs.length}, 1fr)` }}>
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
