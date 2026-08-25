import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { Card, ListGroup, Row } from "@/shared/ui/primitives";

type RuntimeInfoCardProps = {
  overview: TrustOverview;
  title?: string;
};

export function RuntimeInfoCard({ overview, title = "运行信息" }: RuntimeInfoCardProps) {
  return (
    <Card title={title} meta={`上次刷新 ${overview.lastRefreshedAt}`}>
      <ListGroup>
        <Row title="设备" extra={overview.deviceLabel} />
        <Row title="系统" extra={overview.androidLabel} />
        <Row title="Root" extra={overview.rootLabel} />
        <Row title="注入" extra={overview.apexLabel} />
        <Row title="版本" extra={overview.versionLabel} />
      </ListGroup>
    </Card>
  );
}
