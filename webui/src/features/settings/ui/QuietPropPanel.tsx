import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("webui");
  return (
    <Card
      title={t("more.quietTitle")}
      meta={t("more.quietMeta")}
      surface={surface}
      className={dense ? "bf-card--dense" : undefined}
    >
      <Row
        title={t("more.quietRow")}
        extra={<Switch checked={dynamicOn} disabled={pending} onChange={onChange} />}
      />
    </Card>
  );
}
