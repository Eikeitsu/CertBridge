import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { Card, ListGroup, Row, Tag } from "@/shared/ui/primitives";

type BuiltinPipelineCardProps = {
  pipeline: TrustOverview["builtinPipeline"];
};

export function BuiltinPipelineCard({ pipeline }: BuiltinPipelineCardProps) {
  return (
    <Card title="内置证书管道">
      <ListGroup>
        {pipeline.map((row) => (
          <Row
            key={row.kind}
            title={row.title}
            desc={row.stateLabel}
            extra={
              row.active ? (
                <Tag tone="ok">生效</Tag>
              ) : row.enabled ? (
                <Tag tone="warn">待重启</Tag>
              ) : (
                <Tag>{row.available ? "可用" : "缺失"}</Tag>
              )
            }
          />
        ))}
      </ListGroup>
    </Card>
  );
}
