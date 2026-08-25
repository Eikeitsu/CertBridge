import { LINKS } from "@/shared/config/brand";
import { openUrl } from "@/shared/api/ksu";
import { Button, Card } from "@/shared/ui/primitives";

export function HideIntroCard() {
  return (
    <Card title="挂载隐藏" meta="换路径不能替代 umount">
      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--cb-ink-2)", lineHeight: 1.55 }}>
        证书桥通过 bind mount 写入系统信任库。检测方仍可能从 mountinfo 发现异常；
        下方实况卡展示本机探测结果，说明区按 Root 方案给出当前生态下的隐藏建议。
      </p>
      <div className="cb-btn-row" style={{ marginTop: 12 }}>
        <Button variant="ghost" onClick={() => void openUrl(`${LINKS.docs}guide/hide`)}>
          查看完整文档
        </Button>
      </div>
    </Card>
  );
}
