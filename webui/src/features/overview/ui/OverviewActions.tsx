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
  const dispatch = useAppDispatch();
  const isRefreshing = useAppSelector(selectStatusRefreshing);

  return (
    <div className={`cb-btn-row${blockPrimary ? " cb-stack" : ""}`.trim()}>
      <Button
        variant="primary"
        className={blockPrimary ? "cb-btn--block" : ""}
        disabled={isRefreshing}
        onClick={() => void dispatch(refreshStatus(true))}
      >
        {refreshLabel}
      </Button>
      <Button
        variant="ghost"
        className={blockPrimary ? "cb-btn--block" : ""}
        onClick={() =>
          confirmAction({
            title: "确认重启设备？",
            content: "重启后应用永久证书变更并清理临时层。",
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
