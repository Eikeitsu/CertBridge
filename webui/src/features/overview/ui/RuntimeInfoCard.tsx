import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { Card, ListGroup, Row } from "@/shared/ui/primitives";

type RuntimeInfoCardProps = {
  overview: TrustOverview;
};

export function RuntimeInfoCard({ overview }: RuntimeInfoCardProps) {
  return (
    <Card title="运行信息" meta={`上次刷新 ${overview.lastRefreshedAt}`}>
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
