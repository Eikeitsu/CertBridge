import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { Notice } from "@/shared/ui/primitives";

type OverviewAlertsProps = {
  overview: TrustOverview;
};

export function OverviewAlerts({ overview }: OverviewAlertsProps) {
  return (
    <>
      {overview.isDisabled ? (
        <Notice tone="alert">模块当前处于停用状态，证书注入不会执行。</Notice>
      ) : null}
      {overview.isPendingReboot ? (
        <Notice tone="alert">有永久变更等待重启后生效。</Notice>
      ) : null}
      {overview.injectDiagnosis?.message ? (
        <Notice tone="error">
          {overview.injectDiagnosis.message}
          {overview.injectDiagnosis.hint ? ` · ${overview.injectDiagnosis.hint}` : ""}
        </Notice>
      ) : null}
    </>
  );
}
