import type { ReactNode } from "react";
import {
  AppOutline,
  AppstoreOutline,
  CheckShieldOutline,
  ContentOutline,
  FileOutline,
  SetOutline,
  UnorderedListOutline,
} from "antd-mobile-icons";
import { TABS } from "@/shared/config/navigation";
import { getPackVoice } from "@/shared/config/packVoice";
import { TabName, ThemePack } from "@/entities/module/enums";

type AppDockProps = {
  pack: ThemePack;
  activeTab: TabName;
  onSwitch: (tab: string) => void;
};

function tabIcon(pack: ThemePack, tab: TabName, active: boolean): ReactNode {
  const size = pack === ThemePack.Material ? 22 : pack === ThemePack.Fluid ? 20 : 21;
  const style = { fontSize: size } as const;
  if (pack === ThemePack.Material) {
    switch (tab) {
      case TabName.Home:
        return <AppstoreOutline style={style} />;
      case TabName.Certs:
        return <CheckShieldOutline style={style} />;
      case TabName.Log:
        return <ContentOutline style={style} />;
      case TabName.More:
        return <SetOutline style={style} />;
    }
  }
  if (pack === ThemePack.Fluid) {
    switch (tab) {
      case TabName.Home:
        return <AppOutline style={style} />;
      case TabName.Certs:
        return <FileOutline style={style} />;
      case TabName.Log:
        return <UnorderedListOutline style={style} />;
      case TabName.More:
        return <SetOutline style={style} />;
    }
  }
  /* classic — outline set */
  switch (tab) {
    case TabName.Home:
      return active ? <AppOutline style={style} /> : <AppOutline style={style} />;
    case TabName.Certs:
      return <CheckShieldOutline style={style} />;
    case TabName.Log:
      return <UnorderedListOutline style={style} />;
    case TabName.More:
      return <SetOutline style={style} />;
  }
}

export function AppDock({ pack, activeTab, onSwitch }: AppDockProps) {
  const voice = getPackVoice(pack);
  const labels: Record<TabName, string> = {
    [TabName.Home]: voice.tabs.home,
    [TabName.Certs]: voice.tabs.certs,
    [TabName.Log]: voice.tabs.log,
    [TabName.More]: voice.tabs.more,
  };

  return (
    <nav className={`nx-dock dock-${pack}`} aria-label="主导航">
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
                {tabIcon(pack, item.key, on)}
              </span>
              <span className="nx-dock__label">{labels[item.key]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
