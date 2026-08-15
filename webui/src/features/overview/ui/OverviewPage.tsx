import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { refreshStatus, requestReboot } from "@/features/status/model/statusSlice";
import {
  selectStatusBootstrapped,
  selectStatusRefreshing,
} from "@/features/status/model/selectors";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { selectThemePack } from "@/features/theme/model/selectors";
import {
  NxActionTile,
  NxButton,
  NxCard,
  NxChip,
  NxEmpty,
  NxHero,
  NxMetrics,
  NxPull,
  NxSection,
  NxSpin,
} from "@/shared/ui";
import { confirmAction } from "@/shared/lib/confirmAction";
import { TAB_PATH } from "@/shared/config/navigation";
import { getPackVoice } from "@/shared/config/packVoice";
import { TabName, TrustTone } from "@/entities/module/enums";

export function OverviewPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const pack = useAppSelector(selectThemePack);
  const voice = getPackVoice(pack);
  const overview = useTrustOverview();
  const isRefreshing = useAppSelector(selectStatusRefreshing);
  const bootstrapped = useAppSelector(selectStatusBootstrapped);
  const showBootSpin = overview.isLoading && !bootstrapped;
  const statusText =
    overview.injectDiagnosis?.hint ||
    (overview.trust.tone === TrustTone.Idle && overview.isLoading
      ? voice.idleDesc
      : overview.activeNames.length
        ? `${voice.activePrefix}${overview.activeNames.join("、")}`
        : overview.trust.hint || overview.description);

  const handleReboot = () => {
    confirmAction({
      title: "确认重启设备？",
      content: voice.rebootHint,
      okText: "重启",
      danger: true,
      onOk: () => dispatch(requestReboot()),
    });
  };

  return (
    <NxSpin spinning={showBootSpin} label={voice.loadingHint}>
      <NxPull onRefresh={() => dispatch(refreshStatus(true)).unwrap()}>
        <NxHero
          tone={overview.trust.tone}
          kicker={voice.stageKicker}
          title={overview.trust.title}
          description={statusText}
          aside={
            <>
              <strong>{overview.activeCount}</strong>
              <span>{voice.metrics.active}</span>
            </>
          }
          badges={
            <>
              {overview.isPendingReboot ? <NxChip tone="warn">待重启生效</NxChip> : null}
              {overview.isHotMountActive ? (
                <NxChip tone="info">临时证书已挂载</NxChip>
              ) : null}
            </>
          }
          footer={
            <>
              <NxButton
                variant="soft"
                loading={isRefreshing}
                onClick={() => void dispatch(refreshStatus(true))}
              >
                {voice.refresh}
              </NxButton>
              {overview.injectDiagnosis?.message ? (
                <NxButton
                  variant="ghost"
                  onClick={() => navigate(TAB_PATH[TabName.Log], { replace: true })}
                >
                  查看诊断
                </NxButton>
              ) : null}
            </>
          }
        />

        {overview.injectDiagnosis?.message ? (
          <div className="nx-diag">
            <span>{overview.injectDiagnosis.message}</span>
            <NxButton
              variant="ghost"
              onClick={() => navigate(TAB_PATH[TabName.Log], { replace: true })}
            >
              日志
            </NxButton>
          </div>
        ) : null}

        <NxMetrics
          items={[
            { label: voice.metrics.active, value: overview.activeCount },
            { label: voice.metrics.custom, value: overview.customCount },
            { label: voice.metrics.baseline, value: overview.baselineCount },
            { label: voice.metrics.store, value: overview.storeCount },
          ]}
        />

        <NxSection eyebrow="Trust" title={voice.trustTitle}>
          <NxCard>
            {overview.activeNames.length ? (
              <div className="nx-pill-cloud">
                {overview.activeNames.map((name) => (
                  <NxChip key={name} tone="accent">
                    {name}
                  </NxChip>
                ))}
              </div>
            ) : (
              <NxEmpty>{voice.trustEmpty}</NxEmpty>
            )}
          </NxCard>
        </NxSection>

        <NxSection eyebrow="Device" title={voice.runtimeTitle}>
          <NxCard>
            <dl className="nx-runtime-list">
              {[
                ["Android", overview.androidLabel],
                ["Root", overview.rootLabel],
                ["APEX", overview.apexLabel],
                ["挂载", overview.mountModeLabel],
                ["版本", overview.versionLabel],
                ["临时会话", overview.hotStatusLabel],
                ["刷新于", overview.lastRefreshedAt],
              ].map(([label, value]) => (
                <div className="nx-runtime-row" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </NxCard>
        </NxSection>

        <NxSection eyebrow="Actions" title={voice.actionsTitle}>
          <div className="nx-action-grid">
            <NxActionTile
              title={voice.manageCerts}
              hint="启用、导入、临时挂载"
              tone="accent"
              onClick={() => navigate(TAB_PATH[TabName.Certs], { replace: true })}
            />
            {overview.isHotMountSupported ? (
              <NxActionTile
                title={voice.tempCerts}
                hint="免重启会话"
                onClick={() => navigate(TAB_PATH[TabName.Certs], { replace: true })}
              />
            ) : null}
            <NxActionTile
              title={voice.rebootTitle}
              hint={voice.rebootHint}
              tone="danger"
              onClick={handleReboot}
            />
          </div>
        </NxSection>
      </NxPull>
    </NxSpin>
  );
}
