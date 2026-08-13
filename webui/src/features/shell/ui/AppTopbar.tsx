import { NavBar } from "antd-mobile";
import { BRAND } from "@/shared/config/brand";
import { ASSETS, assetUrl } from "@/shared/config/assets";

type AppTopbarProps = {
  isMaterial: boolean;
  deviceLabel: string;
};

export function AppTopbar({ isMaterial, deviceLabel }: AppTopbarProps) {
  return (
    <header className={`app-topbar${isMaterial ? " topbar-md3" : ""}`}>
      <NavBar
        backIcon={false}
        left={
          isMaterial ? null : <img className="logo" src={assetUrl(ASSETS.icon)} alt="" />
        }
        right={<span className="device-chip">{deviceLabel}</span>}
      >
        <span className="nav-title">{BRAND.name}</span>
      </NavBar>
    </header>
  );
}
