import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { MetricGrid } from "@/shared/ui/layout";

type TrustMetricsProps = {
  overview: TrustOverview;
  labels: { active: string; custom: string; baseline: string; store: string };
};

export function TrustMetrics({ overview, labels }: TrustMetricsProps) {
  return (
    <MetricGrid
      items={[
        { label: labels.active, value: overview.activeCount },
        { label: labels.custom, value: overview.customCount },
        { label: labels.baseline, value: overview.baselineCount },
        { label: labels.store, value: overview.storeCount },
      ]}
    />
  );
}
