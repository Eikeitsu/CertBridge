import { ThemePack } from "@/entities/module/enums";

type AppTopbarProps = {
  pack: ThemePack;
  brand: string;
  pageTitle: string;
  deviceLabel: string;
  versionLabel?: string;
  showBrand: boolean;
  showDevice: boolean;
};

export function AppTopbar({
  pack,
  brand,
  pageTitle,
  deviceLabel,
  versionLabel,
  showBrand,
  showDevice,
}: AppTopbarProps) {
  if (pack === ThemePack.Console) {
    const parts = [pageTitle, showDevice ? deviceLabel : "", versionLabel]
      .filter(Boolean)
      .join(" · ");
    return (
      <header className="cb-topbar cb-topbar--console">
        <div className="cb-topbar__title">{parts}</div>
      </header>
    );
  }

  if (pack === ThemePack.Studio) {
    return (
      <header className="cb-topbar cb-topbar--studio">
        <div className="cb-topbar__title">{pageTitle}</div>
      </header>
    );
  }

  return (
    <header className="cb-topbar">
      {showBrand ? <div className="cb-topbar__brand">{brand}</div> : <span />}
      <div className="cb-topbar__title">{pageTitle}</div>
      {showDevice ? <div className="cb-topbar__meta">{deviceLabel}</div> : <span />}
    </header>
  );
}
