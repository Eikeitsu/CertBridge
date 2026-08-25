import { useAppSelector } from "@/app/store/hooks";
import {
  selectStatusBootstrapped,
} from "@/features/status/model/selectors";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { PageStack } from "@/shared/ui/layout";
import { Loader } from "@/shared/ui/primitives";
import { OverviewAlerts } from "./OverviewAlerts";
import { TrustHero } from "./TrustHero";
import { TrustMetrics } from "./TrustMetrics";
import { BuiltinPipelineCard } from "./BuiltinPipelineCard";
import { OverviewActions } from "./OverviewActions";
import { RuntimeInfoCard } from "./RuntimeInfoCard";

export function OverviewPage() {
  const overview = useTrustOverview();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const showBootSpin = overview.isLoading && !bootstrapped;

  if (showBootSpin) return <Loader label="正在读取模块状态…" />;

  return (
    <PageStack>
      <OverviewAlerts overview={overview} />
      <TrustHero overview={overview} />
      <TrustMetrics overview={overview} />
      <BuiltinPipelineCard pipeline={overview.builtinPipeline} />
      <OverviewActions />
      <RuntimeInfoCard overview={overview} />
    </PageStack>
  );
}
