import type { ReactNode } from "react";
import { TabName } from "@/entities/module/enums";
import { TabPane } from "./TabPane";

type AppTabPaneProps = {
  tab: TabName;
  activeTab: TabName;
  /** 兼容旧名 seen；与 mounted 同义 */
  seen?: boolean;
  mounted?: boolean;
  children: ReactNode;
  loadingLabel?: string;
};

export function AppTabPane({ tab, activeTab, seen, mounted, children }: AppTabPaneProps) {
  const isMounted = mounted ?? seen ?? false;
  return (
    <TabPane active={activeTab === tab} mounted={isMounted} className="bf-pane">
      {children}
    </TabPane>
  );
}
