import { NavBar } from "antd-mobile";
import { ASSETS, assetUrl } from "@/shared/config/assets";
import { ThemePack } from "@/entities/module/enums";

type AppTopbarProps = {
  pack: ThemePack;
  brandTitle: string;
  deviceLabel: string;
};

export function AppTopbar({ pack, brandTitle, deviceLabel }: AppTopbarProps) {
  const isStrata = pack === ThemePack.Material;

  return (
    <header className={`app-topbar topbar-${pack}`}>
      <NavBar
        backIcon={false}
        left={
          isStrata ? null : <img className="logo" src={assetUrl(ASSETS.icon)} alt="" />
        }
        right={<span className="device-chip">{deviceLabel}</span>}
      >
        <span className="nav-title">{brandTitle}</span>
      </NavBar>
    </header>
  );
}
