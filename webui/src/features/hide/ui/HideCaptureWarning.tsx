import { Notice, Card } from "@/shared/ui/primitives";

type HideCaptureWarningProps = {
  title?: string;
  meta?: string;
  banner?: boolean;
};

export function HideCaptureWarning({
  title = "抓包注意",
  meta = "比开关更重要",
  banner,
}: HideCaptureWarningProps) {
  if (banner) {
    return (
      <Notice tone="alert">
        <strong>{title}</strong>：对 Reqable / ProxyPin 或被抓包目标开「卸载模块 /
        Umount」会卸掉 cacerts 挂载，抓包软件常报「根证书未安装」。
      </Notice>
    );
  }

  return (
    <Card title={title} meta={meta}>
      <Notice tone="alert">
        对 Reqable / ProxyPin，或被抓包的目标 App 开启「卸载模块 /
        Umount」、DenyList+umount、APatch 「排除修改」等，会卸掉 cacerts 上的证书挂载。
      </Notice>
      <ul
        style={{
          margin: "12px 0 0",
          paddingLeft: 18,
          fontSize: "0.82rem",
          color: "var(--cb-ink-2)",
          lineHeight: 1.55,
        }}
      >
        <li>
          <strong style={{ color: "var(--cb-ink)" }}>抓包软件</strong>
          ：开了卸载模块 → 软件内常显示「根证书未安装」
        </li>
        <li>
          <strong style={{ color: "var(--cb-ink)" }}>被抓包 App</strong>
          ：开了卸载模块 → TLS 看不到抓包 CA → 断网 / 证书错误
        </li>
        <li>
          仅对
          <strong style={{ color: "var(--cb-ink)" }}>需要躲检测、且不参与本次抓包</strong>
          的应用开启隐藏；抓包链路相关包名一律关掉 umount
        </li>
      </ul>
    </Card>
  );
}
