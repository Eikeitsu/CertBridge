type AppTopbarProps = {
  pageTitle: string;
  deviceLabel: string;
};

export function AppTopbar({ pageTitle, deviceLabel }: AppTopbarProps) {
  return (
    <header className="cb-topbar">
      <div className="cb-topbar__brand">证书桥</div>
      <div className="cb-topbar__title">{pageTitle}</div>
      <div className="cb-topbar__meta">{deviceLabel}</div>
    </header>
  );
}
