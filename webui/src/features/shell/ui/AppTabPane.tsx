import type { ReactNode } from "react";
import { TabName } from "@/entities/module/enums";

type AppTabPaneProps = {
  tab: TabName;
  activeTab: TabName;
  seen: boolean;
  children: ReactNode;
};

export function AppTabPane({ tab, activeTab, seen, children }: AppTabPaneProps) {
  return (
    <section
      className={`cb-pane${activeTab === tab ? " is-on" : ""}`}
      aria-hidden={activeTab !== tab}
    >
      {seen ? children : null}
    </section>
  );
}
