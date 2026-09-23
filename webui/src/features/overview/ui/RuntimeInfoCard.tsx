import { useTranslation } from "react-i18next";
import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { Card, ListGroup, Row } from "@/shared/ui/primitives";

type RuntimeInfoCardProps = {
  overview: TrustOverview;
  title?: string;
};

export function RuntimeInfoCard({ overview, title }: RuntimeInfoCardProps) {
  const { t } = useTranslation("webui");
  return (
    <Card
      title={title ?? t("overview.runtimeTitle")}
      meta={t("overview.lastRefresh", { time: overview.lastRefreshedAt })}
    >
      <ListGroup>
        <Row title={t("overview.envDevice")} extra={overview.deviceName} />
        <Row title={t("overview.envSystem")} extra={overview.androidLabel} />
        <Row title="Root" extra={overview.rootLabel} />
        <Row title={t("overview.envInject")} extra={overview.apexLabel} />
        <Row title={t("overview.envVersion")} extra={overview.versionLabel} />
      </ListGroup>
    </Card>
  );
}
