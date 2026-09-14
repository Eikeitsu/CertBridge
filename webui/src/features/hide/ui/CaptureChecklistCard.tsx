import { useCallback, useState } from "react";
import { Card, Button, Notice } from "@/shared/ui/primitives";
import { STORAGE_KEYS } from "@/shared/config/paths";

const CHECKLIST = [
  "Reqable / ProxyPin：关闭「卸载模块 / Umount / 排除修改」",
  "本次被抓包的目标 App：同样关闭上述隐藏",
  "仅对「要躲检测且不参与本次抓包」的其它 App 再开卸载模块",
  "需要 maps 自藏时：自定义安装勾选 Zygisk 过滤，并确认设备已开 Zygisk",
] as const;

type CaptureChecklistCardProps = {
  title?: string;
  meta?: string;
  dismissLabel?: string;
};

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.captureChecklistDismissed) === "1";
  } catch {
    return false;
  }
}

export function CaptureChecklistCard({
  title = "抓包检查清单",
  meta = "首次建议过一遍",
  dismissLabel = "知道了，不再显示",
}: CaptureChecklistCardProps) {
  const [dismissed, setDismissed] = useState(readDismissed);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.captureChecklistDismissed, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  return (
    <Card title={title} meta={meta}>
      <Notice tone="alert">证书要生效，抓包链路相关 App 必须能看见 cacerts 挂载。</Notice>
      <ol
        style={{
          margin: "12px 0 0",
          paddingLeft: 18,
          fontSize: "0.82rem",
          color: "var(--cb-ink-2)",
          lineHeight: 1.55,
        }}
      >
        {CHECKLIST.map((item) => (
          <li key={item} style={{ marginBottom: 6 }}>
            {item}
          </li>
        ))}
      </ol>
      <div className="cb-btn-row" style={{ marginTop: 12 }}>
        <Button onClick={handleDismiss}>{dismissLabel}</Button>
      </div>
    </Card>
  );
}
