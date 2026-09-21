import { useEffect, useMemo, useState } from "react";
import {
  SquareTerminal,
  Binary,
  FileCode2,
  Ghost,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppSelector } from "@/app/store/hooks";
import { useActiveTab } from "@/features/shell/hooks/useActiveTab";
import { useVisibleTabs } from "@/features/shell/hooks/useVisibleTabs";
import { useImmersiveChrome } from "@/features/shell/hooks/useImmersiveChrome";
import { selectResolvedTheme } from "@/features/theme/model/selectors";
import {
  selectStatusLoading,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { TabName } from "@/entities/module/enums";
import { AppSnackbar } from "@/shared/ui/AppSnackbar";
import { ConfirmHost } from "@/shared/ui/ConfirmHost";
import { CONSOLE_VOICE } from "./voice";
import { ConsoleHomePage } from "./pages/HomePage";
import { ConsoleCertsPage } from "./pages/CertsPage";
import { ConsoleLogPage } from "./pages/LogPage";
import { ConsoleHidePage } from "./pages/HidePage";
import { ConsoleMorePage } from "./pages/MorePage";

const ICONS: Record<TabName, LucideIcon> = {
  [TabName.Home]: SquareTerminal,
  [TabName.Certs]: Binary,
  [TabName.Log]: FileCode2,
  [TabName.Hide]: Ghost,
  [TabName.More]: SlidersHorizontal,
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
      className={`pk-con-pane${active === tab ? " is-on" : ""}`}
      aria-hidden={active !== tab}
    >
      {seen ? children : null}
    </section>
  );
}

export function ConsoleShell() {
  const refreshing = useAppSelector(selectStatusRefreshing);
  const loading = useAppSelector(selectStatusLoading);
  const resolved = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab } = useActiveTab();
  const { tabs, showHideTab } = useVisibleTabs();
  const v = CONSOLE_VOICE;
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
    <div className="pk-con-shell">
      <div
        className={`pk-con-progress${refreshing || loading ? " is-on" : ""}`}
        aria-hidden
      />
      <header className="pk-con-topbar">
        <code className="pk-con-topbar__path">
          ~/{v.brand}/{v.tabs[activeTab]}
        </code>
        <span className="pk-con-topbar__blink" aria-hidden>
          _
        </span>
      </header>
      <main className="pk-con-main">
        <Pane tab={TabName.Home} active={activeTab} seen={!!seen[TabName.Home]}>
          <ConsoleHomePage />
        </Pane>
        <Pane tab={TabName.Certs} active={activeTab} seen={!!seen[TabName.Certs]}>
          <ConsoleCertsPage />
        </Pane>
        <Pane tab={TabName.Log} active={activeTab} seen={!!seen[TabName.Log]}>
          <ConsoleLogPage />
        </Pane>
        {showHideTab ? (
          <Pane tab={TabName.Hide} active={activeTab} seen={!!seen[TabName.Hide]}>
            <ConsoleHidePage />
          </Pane>
        ) : null}
        <Pane tab={TabName.More} active={activeTab} seen={!!seen[TabName.More]}>
          <ConsoleMorePage />
        </Pane>
      </main>
      <nav
        className="pk-con-dock"
        style={{ gridTemplateColumns: `repeat(${dockTabs.length}, 1fr)` }}
      >
        {dockTabs.map((tab) => {
          const Icon = ICONS[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              className={`pk-con-dock__item${activeTab === tab.key ? " is-on" : ""}`}
              onClick={() => switchTab(tab.key)}
            >
              <Icon size={16} strokeWidth={1.5} />
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
