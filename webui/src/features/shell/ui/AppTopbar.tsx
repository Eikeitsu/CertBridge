import { ASSETS, assetUrl } from "@/shared/config/assets";
import { getPackVoice } from "@/shared/config/packVoice";
import { ThemePack } from "@/entities/module/enums";

type AppTopbarProps = {
  pack: ThemePack;
  pageTitle: string;
  deviceLabel: string;
};

export function AppTopbar({ pack, pageTitle, deviceLabel }: AppTopbarProps) {
  const voice = getPackVoice(pack);

  if (pack === ThemePack.Classic) {
    return (
      <header className="nx-topbar topbar-classic">
        <div className="nx-topbar__inner nx-topbar__inner--center">
          <h1 key={pageTitle} className="nx-topbar__title">
            {pageTitle}
          </h1>
          {deviceLabel ? <span className="nx-topbar__chip">{deviceLabel}</span> : null}
        </div>
      </header>
    );
  }

  if (pack === ThemePack.Material) {
    return (
      <header className="nx-topbar topbar-material">
        <div className="nx-topbar__inner">
          <span className="nx-topbar__mark" aria-hidden>
            <img src={assetUrl(ASSETS.icon)} alt="" />
          </span>
          <div className="nx-topbar__titles">
            <p className="nx-topbar__brand">{voice.topbarBrand}</p>
            <h1 key={pageTitle} className="nx-topbar__title">
              {pageTitle}
            </h1>
          </div>
          {deviceLabel ? <span className="nx-topbar__chip">{deviceLabel}</span> : null}
        </div>
      </header>
    );
  }

  return (
    <header className="nx-topbar topbar-fluid">
      <div className="nx-topbar__inner">
        <div className="nx-topbar__titles">
          <p className="nx-topbar__brand">{voice.topbarKicker}</p>
          <h1 key={pageTitle} className="nx-topbar__title">
            {pageTitle}
          </h1>
        </div>
        {deviceLabel ? <span className="nx-topbar__chip">{deviceLabel}</span> : null}
      </div>
    </header>
  );
}
