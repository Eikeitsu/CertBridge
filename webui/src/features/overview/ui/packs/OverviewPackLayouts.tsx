import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import type { PackVoice } from "@/shared/config/packVoice";
import { PageStack } from "@/shared/ui/layout";
import { Card, ListGroup, Row } from "@/shared/ui/primitives";
import { OverviewAlerts } from "../OverviewAlerts";
import { TrustHero } from "../TrustHero";
import { BuiltinPipelineCard } from "../BuiltinPipelineCard";
import { OverviewActions } from "../OverviewActions";
import { RuntimeInfoCard } from "../RuntimeInfoCard";

type Props = { overview: TrustOverview; voice: PackVoice };

/** 设置主题：大标题 + 状态摘要 + 分组列表，弱化大 Hero */
export function OverviewSettingsLayout({ overview, voice }: Props) {
  return (
    <PageStack className="cb-stack--loose">
      <div>
        <h1 className="cb-page-title">{voice.tabs.home}</h1>
        <p className="cb-page-sub">{voice.overview.kicker}</p>
      </div>
      <OverviewAlerts overview={overview} />
      <TrustHero
        overview={overview}
        kicker={voice.overview.kicker}
        emptyActive={voice.overview.emptyActive}
        variant="summary"
      />
      <BuiltinPipelineCard
        pipeline={overview.builtinPipeline}
        title={voice.overview.pipelineTitle}
      />
      <RuntimeInfoCard overview={overview} title={voice.overview.runtimeTitle} />
      <Card>
        <OverviewActions
          refreshLabel={voice.overview.refresh}
          rebootLabel={voice.overview.reboot}
        />
      </Card>
    </PageStack>
  );
}

/** 控制台：指标网格优先 + 表格式流水线 */
export function OverviewConsoleLayout({ overview, voice }: Props) {
  return (
    <PageStack className="cb-stack--tight">
      <OverviewAlerts overview={overview} />
      <TrustHero
        overview={overview}
        kicker={voice.overview.kicker}
        emptyActive={voice.overview.emptyActive}
        variant="summary"
      />
      <div className="cb-metrics">
        {[
          { label: voice.overview.metrics.active, value: overview.activeCount },
          { label: voice.overview.metrics.custom, value: overview.customCount },
          { label: voice.overview.metrics.baseline, value: overview.baselineCount },
          { label: voice.overview.metrics.store, value: overview.storeCount },
        ].map((item) => (
          <div key={item.label} className="cb-metric">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <Card title={voice.overview.pipelineTitle}>
        <table className="cb-table">
          <thead>
            <tr>
              <th>kind</th>
              <th>state</th>
              <th>flag</th>
            </tr>
          </thead>
          <tbody>
            {overview.builtinPipeline.map((row) => (
              <tr key={row.kind}>
                <td>{row.title}</td>
                <td>{row.stateLabel}</td>
                <td>{row.active ? "ON" : row.enabled ? "PEND" : "OFF"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title={voice.overview.runtimeTitle}>
        <ListGroup>
          <Row title="device" extra={overview.deviceLabel} />
          <Row title="android" extra={overview.androidLabel} />
          <Row title="root" extra={overview.rootLabel} />
          <Row title="inject" extra={overview.apexLabel} />
          <Row title="ver" extra={overview.versionLabel} />
        </ListGroup>
      </Card>
      <OverviewActions
        refreshLabel={voice.overview.refresh}
        rebootLabel={voice.overview.reboot}
      />
    </PageStack>
  );
}

/** 工作室：Status Canvas + 大主按钮 */
export function OverviewStudioLayout({ overview, voice }: Props) {
  return (
    <PageStack className="cb-stack--loose">
      <OverviewAlerts overview={overview} />
      <TrustHero
        overview={overview}
        kicker={voice.overview.kicker}
        emptyActive={voice.overview.emptyActive}
        variant="canvas"
      />
      <div className="cb-metrics">
        {[
          { label: voice.overview.metrics.active, value: overview.activeCount },
          { label: voice.overview.metrics.custom, value: overview.customCount },
          { label: voice.overview.metrics.baseline, value: overview.baselineCount },
          { label: voice.overview.metrics.store, value: overview.storeCount },
        ].map((item) => (
          <div key={item.label} className="cb-metric">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <BuiltinPipelineCard
        pipeline={overview.builtinPipeline}
        title={voice.overview.pipelineTitle}
      />
      <OverviewActions
        refreshLabel={voice.overview.refresh}
        rebootLabel={voice.overview.reboot}
        blockPrimary
      />
      <RuntimeInfoCard overview={overview} title={voice.overview.runtimeTitle} />
    </PageStack>
  );
}
