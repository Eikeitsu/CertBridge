import { useTranslation } from "react-i18next";
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
  title,
  meta,
  rowTitle,
  rowDesc,
  surface = "card",
}: ShowHideTabCardProps) {
  const { t } = useTranslation("webui");
  const { showHideTab, setShowHideTab } = useShowHideTab();

  return (
    <Card
      title={title ?? t("more.navTitle")}
      meta={meta ?? t("more.navMeta")}
      surface={surface}
    >
      <Row
        title={rowTitle ?? t("more.showHideTitle")}
        desc={rowDesc ?? t("more.showHideDesc")}
        extra={<Switch checked={showHideTab} onChange={setShowHideTab} />}
      />
    </Card>
  );
}
