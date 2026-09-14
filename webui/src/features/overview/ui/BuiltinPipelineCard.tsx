import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { Card, ListGroup, Row, Tag } from "@/shared/ui/primitives";

type BuiltinPipelineCardProps = {
  pipeline: TrustOverview["builtinPipeline"];
  title?: string;
  compact?: boolean;
};

export function BuiltinPipelineCard({
  pipeline,
  title = "内置证书",
  compact = false,
}: BuiltinPipelineCardProps) {
  if (compact) {
    return (
      <div className="cb-chip-row" aria-label={title}>
        <span className="cb-chip-row__label">{title}</span>
        {pipeline.map((row) => (
          <span
            key={row.kind}
            className={`cb-chip${row.active ? " is-on" : row.enabled ? " is-pend" : ""}`}
          >
            {row.title}
            <em>{row.active ? "生效" : row.enabled ? "待重启" : row.available ? "可用" : "缺失"}</em>
          </span>
        ))}
      </div>
    );
  }

  return (
    <Card title={title}>
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
