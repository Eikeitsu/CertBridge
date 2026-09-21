import { Card, Row, Switch } from "@/shared/ui/primitives";
import { useShowHideTab } from "../hooks/useShowHideTab";

type ShowHideTabCardProps = {
  title?: string;
  meta?: string;
  rowTitle?: string;
  rowDesc?: string;
  surface?: "card" | "plain";
};

export function ShowHideTabCard({
  title = "导航",
  meta = "自定义底栏显示的页面",
  rowTitle = "显示「隐藏」页",
  rowDesc = "关闭后底栏不再出现隐藏 Tab，功能仍可在安装组件后使用",
  surface = "card",
}: ShowHideTabCardProps) {
  const { showHideTab, setShowHideTab } = useShowHideTab();

  return (
    <Card title={title} meta={meta} surface={surface}>
      <Row
        title={rowTitle}
        desc={rowDesc}
        extra={<Switch checked={showHideTab} onChange={setShowHideTab} />}
      />
    </Card>
  );
}
