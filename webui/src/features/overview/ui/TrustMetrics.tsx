import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { MetricGrid } from "@/shared/ui/layout";

type TrustMetricsProps = {
  overview: TrustOverview;
};

export function TrustMetrics({ overview }: TrustMetricsProps) {
  return (
    <MetricGrid
      items={[
        { label: "启用", value: overview.activeCount },
        { label: "自定义", value: overview.customCount },
        { label: "基线", value: overview.baselineCount },
        { label: "库内", value: overview.storeCount },
      ]}
    />
  );
}
