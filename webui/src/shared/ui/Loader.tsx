type LoaderProps = {
  label?: string;
};

/**
 * 自研加载指示器：只用 transform / opacity 关键帧，
 * 在 Android WebView 主线程繁忙时依然能继续走动（antd-mobile 的 SVG 版会卡住）。
 */
export function Loader({ label }: LoaderProps) {
  return (
    <div className="cb-loader" role="status">
      <span className="cb-loader__spin" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {label ? <span className="cb-loader__label">{label}</span> : null}
    </div>
  );
}
