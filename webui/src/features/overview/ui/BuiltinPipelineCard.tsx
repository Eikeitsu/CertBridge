import { useTranslation } from "react-i18next";
import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { Card, ListGroup, Row, Tag } from "@/shared/ui/primitives";

type BuiltinPipelineCardProps = {
  pipeline: TrustOverview["builtinPipeline"];
  title?: string;
  compact?: boolean;
};

export function BuiltinPipelineCard({
  pipeline,
  title,
  compact = false,
}: BuiltinPipelineCardProps) {
  const { t } = useTranslation("webui");
  const resolvedTitle = title ?? t("overview.pipelineTitle");

  const chipLabel = (row: TrustOverview["builtinPipeline"][number]) => {
    if (row.active) return t("overview.pipelineOn");
    if (row.enabled) return t("overview.pipelinePending");
    if (row.available) return t("overview.pipelineReady");
    return t("overview.pipelineMissing");
  };

  if (compact) {
    return (
      <div className="bf-chip-row" aria-label={resolvedTitle}>
        <span className="bf-chip-row__label">{resolvedTitle}</span>
        {pipeline.map((row) => (
          <span
            key={row.kind}
            className={`bf-chip${row.active ? " is-on" : row.enabled ? " is-pend" : ""}`}
          >
            {row.title}
            <em>{chipLabel(row)}</em>
          </span>
        ))}
      </div>
    );
  }

  return (
    <Card title={resolvedTitle}>
      <ListGroup>
        {pipeline.map((row) => (
          <Row
            key={row.kind}
            title={row.title}
            desc={row.stateLabel}
            extra={
              row.active ? (
                <Tag tone="ok">{t("overview.pipelineOn")}</Tag>
              ) : row.enabled ? (
                <Tag tone="warn">{t("overview.pipelinePending")}</Tag>
              ) : (
                <Tag>
                  {row.available
                    ? t("overview.pipelineReady")
                    : t("overview.pipelineMissing")}
                </Tag>
              )
            }
          />
        ))}
      </ListGroup>
    </Card>
  );
}
