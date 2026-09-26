import { useEffect, useMemo } from "react";
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
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";
import { TabPane, TabPendingOverlay } from "@/features/shell/ui/TabPane";
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

export function ConsoleShell() {
  const chrome = usePackChrome();
  const refreshing = useAppSelector(selectStatusRefreshing);
  const loading = useAppSelector(selectStatusLoading);
  const resolved = useAppSelector(selectResolvedTheme);
  const { activeTab, switchTab, mounted, tabPending } = useActiveTab();
  const { tabs, showHideTab } = useVisibleTabs();
  const v = chrome;

  useImmersiveChrome(resolved, false, undefined, "/");

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
        <TabPendingOverlay show={tabPending} />
        <TabPane
          active={activeTab === TabName.Home}
          mounted={!!mounted[TabName.Home]}
          className="pk-con-pane"
        >
          <ConsoleHomePage />
        </TabPane>
        <TabPane
          active={activeTab === TabName.Certs}
          mounted={!!mounted[TabName.Certs]}
          className="pk-con-pane"
        >
          <ConsoleCertsPage />
        </TabPane>
        <TabPane
          active={activeTab === TabName.Log}
          mounted={!!mounted[TabName.Log]}
          className="pk-con-pane"
        >
          <ConsoleLogPage />
        </TabPane>
        {showHideTab ? (
          <TabPane
            active={activeTab === TabName.Hide}
            mounted={!!mounted[TabName.Hide]}
            className="pk-con-pane"
          >
            <ConsoleHidePage />
          </TabPane>
        ) : null}
        <TabPane
          active={activeTab === TabName.More}
          mounted={!!mounted[TabName.More]}
          className="pk-con-pane"
        >
          <ConsoleMorePage />
        </TabPane>
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
