type AppTopbarProps = {
  brand: string;
  pageTitle: string;
  deviceLabel: string;
  showBrand?: boolean;
  showDevice?: boolean;
};

export function AppTopbar({
  brand,
  pageTitle,
  deviceLabel,
  showBrand = true,
  showDevice = true,
}: AppTopbarProps) {
  return (
    <header className="bf-topbar">
      {showBrand ? <div className="bf-topbar__brand">{brand}</div> : <span />}
      <div className="bf-topbar__title">{pageTitle}</div>
      {showDevice ? <div className="bf-topbar__meta">{deviceLabel}</div> : <span />}
    </header>
  );
}
