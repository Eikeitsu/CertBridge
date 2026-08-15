import { TABS } from "@/shared/config/navigation";
import { TabName } from "@/entities/module/enums";

const TAB_GLYPH: Record<TabName, string> = {
  [TabName.Home]: "◈",
  [TabName.Certs]: "▣",
  [TabName.Log]: "☰",
  [TabName.More]: "◉",
};

type AppDockProps = {
  activeTab: TabName;
  onSwitch: (tab: string) => void;
};

export function AppDock({ activeTab, onSwitch }: AppDockProps) {
  return (
    <nav className="nx-dock" aria-label="主导航">
      <div className="nx-dock__rail">
        {TABS.map((item) => {
          const on = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`nx-dock__item${on ? " is-on" : ""}`}
              aria-current={on ? "page" : undefined}
              onClick={() => onSwitch(item.key)}
            >
              <span className="nx-dock__glyph" aria-hidden>
                {TAB_GLYPH[item.key]}
              </span>
              <span className="nx-dock__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
