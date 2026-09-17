import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { ThemePack, TrustTone } from "@/entities/module/enums";
import { PageStack } from "@/shared/ui/layout";
import { Loader, Tag } from "@/shared/ui/primitives";
import { HelpCollapse } from "@/shared/ui/HelpCollapse";
import { StatusStage } from "@/shared/ui/StatusStage";
import { OverviewAlerts } from "./OverviewAlerts";
import { OverviewActions } from "./OverviewActions";
import { BuiltinPipelineCard } from "./BuiltinPipelineCard";

export function OverviewPage() {
  const dispatch = useAppDispatch();
  const overview = useTrustOverview();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const { pack, voice } = usePackVoice();
  const showBootSpin = overview.isLoading && !bootstrapped;

  const stabilizing =
    overview.trust.tone === TrustTone.Idle &&
    /稳定中|注入中|检测中/.test(overview.trust.title);

  useEffect(() => {
    if (!bootstrapped || !stabilizing) return;
    const timers = [2500, 8000].map((ms) =>
      window.setTimeout(() => {
        void dispatch(
          refreshStatus({ toast: false, syncApps: false, live: true }),
        );
      }, ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [bootstrapped, stabilizing, dispatch]);

  const desc =
    overview.injectDiagnosis?.hint ||
    (overview.activeNames.length
      ? overview.activeNames.join(" · ")
      : overview.trust.hint ||
        overview.description ||
        voice.overview.emptyActive);

  const metrics = useMemo(
    () => [
      { label: voice.overview.metrics.active, value: overview.activeCount },
      { label: voice.overview.metrics.custom, value: overview.customCount },
      { label: voice.overview.metrics.baseline, value: overview.baselineCount },
    ],
    [overview, voice],
  );

  const toneTag =
    overview.trust.tone === TrustTone.Ok
      ? "ok"
      : overview.trust.tone === TrustTone.Bad
        ? "bad"
        : overview.trust.tone === TrustTone.Warn
          ? "warn"
          : "default";

  if (showBootSpin) return <Loader label={voice.loadingHint} />;

  return (
    <PageStack className="bf-stack--loose bf-home">
      <OverviewAlerts overview={overview} />
      <StatusStage
        tone={overview.trust.tone}
        kicker={voice.overview.kicker}
        title={overview.trust.title}
        description={desc}
        showHeroValue
        heroValue={overview.activeCount}
        flags={
          <>
            <Tag tone={toneTag}>{overview.shortDesc}</Tag>
            {overview.isHotMountActive ? <Tag tone="ok">HOT</Tag> : null}
          </>
        }
        footer={
          <OverviewActions
            refreshLabel={voice.overview.refresh}
            rebootLabel={voice.overview.reboot}
            blockPrimary
          />
        }
      />
      <div className="bf-metrics bf-metrics--3">
        {metrics.map((item) => (
          <div key={item.label} className="bf-metric">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <BuiltinPipelineCard
        pipeline={overview.builtinPipeline}
        title={voice.overview.pipelineTitle}
        compact
      />
      <HelpCollapse
        title={voice.overview.runtimeTitle}
        defaultOpen={pack === ThemePack.Console || pack === ThemePack.Ops}
      >
        <dl className="bf-env-grid">
          <div>
            <dt>设备</dt>
            <dd>{overview.deviceLabel}</dd>
          </div>
          <div>
            <dt>系统</dt>
            <dd>{overview.androidLabel}</dd>
          </div>
          <div>
            <dt>Root</dt>
            <dd>{overview.rootLabel}</dd>
          </div>
          <div>
            <dt>注入</dt>
            <dd>{overview.apexLabel}</dd>
          </div>
          <div>
            <dt>挂载</dt>
            <dd>{overview.mountModeLabel}</dd>
          </div>
          <div>
            <dt>版本</dt>
            <dd>{overview.versionLabel}</dd>
          </div>
        </dl>
        <p className="bf-env-meta">上次刷新 {overview.lastRefreshedAt}</p>
      </HelpCollapse>
    </PageStack>
  );
}
