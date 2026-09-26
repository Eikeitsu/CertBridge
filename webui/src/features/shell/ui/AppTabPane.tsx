import type { ReactNode } from "react";
import { TabName } from "@/entities/module/enums";
import { DeferredTabPane } from "./DeferredTabPane";

type AppTabPaneProps = {
  tab: TabName;
  activeTab: TabName;
  seen: boolean;
  children: ReactNode;
  loadingLabel?: string;
};

export function AppTabPane({
  tab,
  activeTab,
  seen,
  children,
  loadingLabel,
}: AppTabPaneProps) {
  return (
    <DeferredTabPane
      active={activeTab === tab}
      seen={seen}
      className="bf-pane"
      loadingLabel={loadingLabel}
    >
      {children}
    </DeferredTabPane>
  );
}
