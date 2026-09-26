import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import { selectStatusBootstrapped } from "@/features/status/model/selectors";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { useStabilizingRefresh } from "@/features/overview/hooks/useStabilizingRefresh";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { ThemePack } from "@/entities/module/enums";
import { PageStack } from "@/shared/ui/layout";
import { Tag } from "@/shared/ui/primitives";
import { HelpCollapse } from "@/shared/ui/HelpCollapse";
import { StatusStage } from "@/shared/ui/StatusStage";
import { OverviewAlerts } from "./OverviewAlerts";
import { OverviewActions } from "./OverviewActions";
import { BuiltinPipelineCard } from "./BuiltinPipelineCard";

export function OverviewPage() {
  const { t } = useTranslation("webui");
  const overview = useTrustOverview();
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const { pack, voice } = usePackVoice();

  useStabilizingRefresh(bootstrapped, overview.trust.title || "", overview.trust.tone);

  const desc =
    overview.injectDiagnosis?.hint ||
    (overview.activeNames.length
      ? overview.activeNames.join(" · ")
      : overview.trust.hint || overview.description || voice.overview.emptyActive);

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
            <dt>{t("overview.envDevice")}</dt>
            <dd>{overview.deviceName}</dd>
          </div>
          <div>
            <dt>{t("overview.envSystem")}</dt>
            <dd>{overview.androidLabel}</dd>
          </div>
          <div>
            <dt>Root</dt>
            <dd>{overview.rootLabel}</dd>
          </div>
          <div>
            <dt>{t("overview.envInject")}</dt>
            <dd>{overview.apexLabel}</dd>
          </div>
          <div>
            <dt>{t("overview.envMount")}</dt>
            <dd>{overview.mountModeLabel}</dd>
          </div>
          <div>
            <dt>{t("overview.envVersion")}</dt>
            <dd>{overview.versionLabel}</dd>
          </div>
        </dl>
        <p className="bf-env-meta">
          {t("overview.lastRefresh", { time: overview.lastRefreshedAt })}
        </p>
      </HelpCollapse>
    </PageStack>
  );
}
