import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { refreshStatus, requestReboot } from "@/features/status/model/statusSlice";
import { selectStatusRefreshing } from "@/features/status/model/selectors";
import { confirmAction } from "@/shared/lib/confirmAction";
import { Button } from "@/shared/ui/primitives";

type OverviewActionsProps = {
  refreshLabel: string;
  rebootLabel: string;
  blockPrimary?: boolean;
};

export function OverviewActions({
  refreshLabel,
  rebootLabel,
  blockPrimary,
}: OverviewActionsProps) {
  const { t } = useTranslation("webui");
  const dispatch = useAppDispatch();
  const isRefreshing = useAppSelector(selectStatusRefreshing);

  return (
    <div className={`bf-btn-row${blockPrimary ? " bf-stack" : ""}`.trim()}>
      <Button
        variant="primary"
        className={blockPrimary ? "bf-btn--block" : ""}
        disabled={isRefreshing}
        onClick={() => void dispatch(refreshStatus(true))}
      >
        {refreshLabel}
      </Button>
      <Button
        variant="ghost"
        className={blockPrimary ? "bf-btn--block" : ""}
        onClick={() =>
          confirmAction({
            title: t("overview.rebootConfirmTitle"),
            content: t("overview.rebootConfirmBody"),
            okText: rebootLabel,
            danger: true,
            onOk: () => dispatch(requestReboot()),
          })
        }
      >
        {rebootLabel}
      </Button>
    </div>
  );
}
