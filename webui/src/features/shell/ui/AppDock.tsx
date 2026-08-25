import { TabName } from "@/entities/module/enums";
import { TABS } from "@/shared/config/navigation";

type AppDockProps = {
  activeTab: TabName;
  onSwitch: (tab: TabName) => void;
};

const TAB_ICON: Record<TabName, string> = {
  [TabName.Home]: "◉",
  [TabName.Certs]: "⎔",
  [TabName.Log]: "≡",
  [TabName.Hide]: "◌",
  [TabName.More]: "⚙",
};

export function AppDock({ activeTab, onSwitch }: AppDockProps) {
  return (
    <nav className="cb-dock" aria-label="主导航">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`cb-dock__item${activeTab === tab.key ? " is-on" : ""}`}
          onClick={() => onSwitch(tab.key)}
        >
          <span className="cb-dock__icon" aria-hidden>
            {TAB_ICON[tab.key]}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
