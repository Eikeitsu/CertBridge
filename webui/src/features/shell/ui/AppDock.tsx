import type { ReactNode } from "react";
import { TabBar } from "antd-mobile";
import {
  AppOutline,
  CheckShieldOutline,
  SetOutline,
  UnorderedListOutline,
} from "antd-mobile-icons";
import { TABS } from "@/shared/config/navigation";
import { TabName } from "@/entities/module/enums";

const TAB_ICONS: Record<TabName, ReactNode> = {
  [TabName.Home]: <CheckShieldOutline />,
  [TabName.Certs]: <AppOutline />,
  [TabName.Log]: <UnorderedListOutline />,
  [TabName.More]: <SetOutline />,
};

type AppDockProps = {
  activeTab: TabName;
  onSwitch: (tab: string) => void;
};

export function AppDock({ activeTab, onSwitch }: AppDockProps) {
  return (
    <nav className="app-dock" aria-label="主导航">
      <TabBar activeKey={activeTab} onChange={onSwitch} safeArea={false}>
        {TABS.map((item) => (
          <TabBar.Item key={item.key} icon={TAB_ICONS[item.key]} title={item.label} />
        ))}
      </TabBar>
    </nav>
  );
}
