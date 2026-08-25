import { TabName, ThemePack } from "@/entities/module/enums";

type AppDockProps = {
  pack: ThemePack;
  activeTab: TabName;
  onSwitch: (tab: TabName) => void;
  tabs: { key: TabName; label: string }[];
};

const TAB_ICON: Record<ThemePack, Record<TabName, string>> = {
  [ThemePack.Settings]: {
    [TabName.Home]: "⌂",
    [TabName.Certs]: "▣",
    [TabName.Log]: "☰",
    [TabName.Hide]: "◌",
    [TabName.More]: "⚙",
  },
  [ThemePack.Console]: {
    [TabName.Home]: "◆",
    [TabName.Certs]: "⌘",
    [TabName.Log]: "▤",
    [TabName.Hide]: "⊘",
    [TabName.More]: "⧉",
  },
  [ThemePack.Studio]: {
    [TabName.Home]: "●",
    [TabName.Certs]: "◆",
    [TabName.Log]: "≡",
    [TabName.Hide]: "○",
    [TabName.More]: "◎",
  },
};

export function AppDock({ pack, activeTab, onSwitch, tabs }: AppDockProps) {
  const dockClass =
    pack === ThemePack.Console
      ? "cb-dock cb-dock--console"
      : pack === ThemePack.Studio
        ? "cb-dock cb-dock--studio"
        : "cb-dock";

  return (
    <nav
      className={dockClass}
      aria-label="主导航"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`cb-dock__item${activeTab === tab.key ? " is-on" : ""}`}
          onClick={() => onSwitch(tab.key)}
        >
          <span className="cb-dock__icon" aria-hidden>
            {TAB_ICON[pack][tab.key]}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
