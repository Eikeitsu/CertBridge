import { LINKS } from "@/shared/config/brand";
import { openUrl } from "@/shared/api/ksu";
import { Button, Card } from "@/shared/ui/primitives";

type HideIntroCardProps = {
  title?: string;
  body?: string;
  docsCta?: string;
  compact?: boolean;
};

export function HideIntroCard({
  title = "挂载隐藏",
  body = "证书桥通过 bind mount 写入系统信任库。抓包软件与被抓包对象必须能看见该挂载，请先阅读上方「抓包注意」。",
  docsCta = "查看完整文档",
  compact,
}: HideIntroCardProps) {
  if (compact) return null;

  return (
    <Card title={title}>
      <p
        style={{
          margin: 0,
          fontSize: "0.85rem",
          color: "var(--cb-ink-2)",
          lineHeight: 1.55,
        }}
      >
        {body}
      </p>
      <div className="cb-btn-row" style={{ marginTop: 12 }}>
        <Button variant="ghost" onClick={() => void openUrl(`${LINKS.docs}guide/hide`)}>
          {docsCta}
        </Button>
      </div>
    </Card>
  );
}
