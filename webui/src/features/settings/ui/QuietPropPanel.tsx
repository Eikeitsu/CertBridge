import { Card, Row, Switch } from "@/shared/ui/primitives";

type QuietPropPanelProps = {
  dynamicOn: boolean;
  pending?: boolean;
  onChange: (dynamicOn: boolean) => void;
  dense?: boolean;
  surface?: "card" | "plain";
};

export function QuietPropPanel({
  dynamicOn,
  pending,
  onChange,
  dense,
  surface = "card",
}: QuietPropPanelProps) {
  return (
    <Card
      title="动态模块简介"
      meta="开启后，管理器列表会写入 emoji 运行状态；关闭则保持中性产品文案（默认关闭）。WebUI 内状态不受影响。"
      surface={surface}
      className={dense ? "bf-card--dense" : undefined}
    >
      <Row
        title="在管理器列表显示运行状态"
        extra={
          <Switch checked={dynamicOn} disabled={pending} onChange={onChange} />
        }
      />
    </Card>
  );
}
