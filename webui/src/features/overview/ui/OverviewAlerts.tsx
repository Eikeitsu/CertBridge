import { useTranslation } from "react-i18next";
import type { TrustOverview } from "@/features/overview/hooks/useTrustOverview";
import { Notice } from "@/shared/ui/primitives";

type OverviewAlertsProps = {
  overview: TrustOverview;
};

export function OverviewAlerts({ overview }: OverviewAlertsProps) {
  const { t } = useTranslation("webui");
  return (
    <>
      {overview.isDisabled ? (
        <Notice tone="alert">{t("overview.moduleDisabled")}</Notice>
      ) : null}
      {overview.isPendingReboot ? (
        <Notice tone="alert">{t("overview.pendingReboot")}</Notice>
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
