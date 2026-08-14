import { ASSETS, assetUrl } from "@/shared/config/assets";
import { ThemePack } from "@/entities/module/enums";

type AppTopbarProps = {
  pack: ThemePack;
  brandTitle: string;
  pageTitle: string;
  kicker: string;
  deviceLabel: string;
};

export function AppTopbar({
  pack,
  brandTitle,
  pageTitle,
  kicker,
  deviceLabel,
}: AppTopbarProps) {
  const isStrata = pack === ThemePack.Material;
  const title = isStrata ? pageTitle : brandTitle;

  return (
    <header className={`app-topbar topbar-${pack}`}>
      <div className="app-topbar__inner">
        {isStrata ? null : (
          <span className="app-topbar__mark" aria-hidden>
            <img src={assetUrl(ASSETS.icon)} alt="" />
          </span>
        )}
        <div className="app-topbar__titles">
          {isStrata ? <span className="app-topbar__kicker">{brandTitle}</span> : null}
          <h1 className="nav-title">{title}</h1>
          {isStrata || !kicker ? null : (
            <span className="app-topbar__kicker">{kicker}</span>
          )}
        </div>
        {deviceLabel ? <span className="device-chip">{deviceLabel}</span> : null}
      </div>
    </header>
  );
}
