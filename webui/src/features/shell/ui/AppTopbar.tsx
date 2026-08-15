import { ASSETS, assetUrl } from "@/shared/config/assets";
import { ThemePack } from "@/entities/module/enums";

type AppTopbarProps = {
  pack: ThemePack;
  pageTitle: string;
  deviceLabel: string;
};

export function AppTopbar({ pack, pageTitle, deviceLabel }: AppTopbarProps) {
  return (
    <header className={`nx-topbar topbar-${pack}`}>
      <div className="nx-topbar__inner">
        <span className="nx-topbar__mark" aria-hidden>
          <img src={assetUrl(ASSETS.icon)} alt="" />
        </span>
        <div className="nx-topbar__titles">
          <p className="nx-topbar__brand">CertBridge</p>
          <h1 key={pageTitle} className="nx-topbar__title">
            {pageTitle}
          </h1>
        </div>
        {deviceLabel ? <span className="nx-topbar__chip">{deviceLabel}</span> : null}
      </div>
    </header>
  );
}
