import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/app/store/hooks";
import { refreshStatus, requestReboot } from "@/features/status/model/statusSlice";
import { useTrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { MetricGrid, PageRefresh, PageSpin } from "@/shared/ui";
import { confirmAction } from "@/shared/lib/confirmAction";
import { TAB_PATH } from "@/shared/config/navigation";
import { TabName } from "@/entities/module/enums";
import { OverviewStage } from "./OverviewStage";
import { OverviewTrust } from "./OverviewTrust";
import { OverviewRuntime } from "./OverviewRuntime";
import { OverviewActions } from "./OverviewActions";

export function OverviewPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const overview = useTrustOverview();
  const statusText =
    overview.injectDiagnosis?.hint || overview.description || overview.trust.hint;

  const handleReboot = () => {
    confirmAction({
      title: "确认重启设备？",
      content: "应用挂载变更建议重启。",
      okText: "重启",
      danger: true,
      onOk: () => dispatch(requestReboot()),
    });
  };

  return (
    <PageSpin spinning={overview.isLoading}>
      <PageRefresh onRefresh={() => dispatch(refreshStatus(true)).unwrap()}>
        <OverviewStage
          tone={overview.trust.tone}
          title={overview.trust.title}
          description={statusText}
          diagnosisMessage={overview.injectDiagnosis?.message}
          isPendingReboot={overview.isPendingReboot}
          isHotMountActive={overview.isHotMountActive}
          onRefresh={() => void dispatch(refreshStatus(true))}
          onViewLog={() => navigate(TAB_PATH[TabName.Log], { replace: true })}
        />
        <MetricGrid
          items={[
            { label: "启用", value: overview.activeCount },
            { label: "自定义", value: overview.customCount },
            { label: "基线", value: overview.baselineCount },
            { label: "总量", value: overview.storeCount },
          ]}
        />
        <OverviewTrust names={overview.activeNames} />
        <OverviewRuntime
          androidLabel={overview.androidLabel}
          rootLabel={overview.rootLabel}
          apexLabel={overview.apexLabel}
          mountModeLabel={overview.mountModeLabel}
          versionLabel={overview.versionLabel}
          hotStatusLabel={overview.hotStatusLabel}
          lastRefreshedAt={overview.lastRefreshedAt}
        />
        <OverviewActions
          isHotMountSupported={overview.isHotMountSupported}
          onReboot={handleReboot}
          onManageCerts={() => navigate(TAB_PATH[TabName.Certs], { replace: true })}
        />
      </PageRefresh>
    </PageSpin>
  );
}
