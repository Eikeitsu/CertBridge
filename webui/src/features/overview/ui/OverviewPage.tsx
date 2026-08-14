import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { refreshStatus, requestReboot } from "@/features/status/model/statusSlice";
import { selectStatusRefreshing } from "@/features/status/model/selectors";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { selectThemePack } from "@/features/theme/model/selectors";
import { MetricGrid, PageRefresh, PageSpin } from "@/shared/ui";
import { confirmAction } from "@/shared/lib/confirmAction";
import { TAB_PATH } from "@/shared/config/navigation";
import { getPackVoice } from "@/shared/config/packVoice";
import { TabName, ThemePack, TrustTone } from "@/entities/module/enums";
import { OverviewStage } from "./OverviewStage";
import { OverviewTrust } from "./OverviewTrust";
import { OverviewRuntime } from "./OverviewRuntime";
import { OverviewActions } from "./OverviewActions";

export function OverviewPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const pack = useAppSelector(selectThemePack);
  const voice = getPackVoice(pack);
  const overview = useTrustOverview();
  const isRefreshing = useAppSelector(selectStatusRefreshing);
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

  const metrics = (
    <MetricGrid
      columns={pack === ThemePack.Material ? 2 : 4}
      items={[
        { label: voice.metrics.active, value: overview.activeCount },
        { label: voice.metrics.custom, value: overview.customCount },
        { label: voice.metrics.baseline, value: overview.baselineCount },
        { label: voice.metrics.store, value: overview.storeCount },
      ]}
    />
  );

  const stage = (
    <OverviewStage
      pack={pack}
      tone={overview.trust.tone}
      title={overview.trust.title}
      description={statusText}
      kicker={voice.stageKicker}
      refreshLabel={voice.refresh}
      heroValue={overview.activeCount}
      diagnosisMessage={overview.injectDiagnosis?.message}
      isPendingReboot={overview.isPendingReboot}
      isHotMountActive={overview.isHotMountActive}
      isRefreshing={isRefreshing}
      onRefresh={() => void dispatch(refreshStatus(true))}
      onViewLog={() => navigate(TAB_PATH[TabName.Log], { replace: true })}
    />
  );

  return (
    <PageSpin spinning={overview.isLoading} label={voice.loadingHint}>
      <PageRefresh onRefresh={() => dispatch(refreshStatus(true)).unwrap()}>
        {pack === ThemePack.Fluid ? (
          <div className="cb-bridge-stack">
            {stage}
            {metrics}
          </div>
        ) : (
          <>
            {stage}
            {metrics}
          </>
        )}
        <OverviewTrust
          title={voice.trustTitle}
          emptyText={voice.trustEmpty}
          names={overview.activeNames}
        />
        <OverviewRuntime
          pack={pack}
          title={voice.runtimeTitle}
          androidLabel={overview.androidLabel}
          rootLabel={overview.rootLabel}
          apexLabel={overview.apexLabel}
          mountModeLabel={overview.mountModeLabel}
          versionLabel={overview.versionLabel}
          hotStatusLabel={overview.hotStatusLabel}
          lastRefreshedAt={overview.lastRefreshedAt}
        />
        <OverviewActions
          title={voice.actionsTitle}
          rebootTitle={voice.rebootTitle}
          rebootHint={voice.rebootHint}
          manageLabel={voice.manageCerts}
          tempLabel={voice.tempCerts}
          isHotMountSupported={overview.isHotMountSupported}
          onReboot={handleReboot}
          onManageCerts={() => navigate(TAB_PATH[TabName.Certs], { replace: true })}
        />
      </PageRefresh>
    </PageSpin>
  );
}
