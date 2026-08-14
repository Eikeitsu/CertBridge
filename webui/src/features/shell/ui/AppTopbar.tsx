import { ASSETS, assetUrl } from "@/shared/config/assets";
import { ThemePack } from "@/entities/module/enums";

type AppTopbarProps = {
  pack: ThemePack;
  pageTitle: string;
  deviceLabel: string;
};

export function AppTopbar({ pack, pageTitle, deviceLabel }: AppTopbarProps) {
  return (
    <header className={`app-topbar topbar-${pack}`}>
      <div className="app-topbar__inner">
        <span className="app-topbar__mark" aria-hidden>
          <img src={assetUrl(ASSETS.icon)} alt="" />
        </span>
        <div className="app-topbar__titles">
          <h1 key={pageTitle} className="nav-title">
            {pageTitle}
          </h1>
        </div>
        {deviceLabel ? <span className="device-chip">{deviceLabel}</span> : null}
      </div>
    </header>
  );
}
