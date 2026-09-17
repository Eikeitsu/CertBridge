type LoaderProps = {
  label?: string;
};

/** CSS spinner：WebView 主线程繁忙时仍能走动 */
export function Loader({ label }: LoaderProps) {
  return (
    <div className="bf-loader" role="status">
      <div className="bf-loader__spin" aria-hidden />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
