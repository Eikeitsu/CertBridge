import { Home, Shield, ScrollText, EyeOff, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TabName } from "@/entities/module/enums";

type AppDockProps = {
  activeTab: TabName;
  onSwitch: (tab: TabName) => void;
  tabs: { key: TabName; label: string }[];
};

const TAB_ICON: Record<TabName, LucideIcon> = {
  [TabName.Home]: Home,
  [TabName.Certs]: Shield,
  [TabName.Log]: ScrollText,
  [TabName.Hide]: EyeOff,
  [TabName.More]: Settings,
};

export function AppDock({ activeTab, onSwitch, tabs }: AppDockProps) {
  return (
    <nav
      className="bf-dock"
      aria-label="???"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map((tab) => {
        const Icon = TAB_ICON[tab.key];
        return (
          <button
            key={tab.key}
            type="button"
            className={`bf-dock__item${activeTab === tab.key ? " is-on" : ""}`}
            onClick={() => onSwitch(tab.key)}
          >
            <span className="bf-dock__icon" aria-hidden>
              <Icon />
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
