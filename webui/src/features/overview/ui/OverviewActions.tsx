import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { refreshStatus, requestReboot } from "@/features/status/model/statusSlice";
import { selectStatusRefreshing } from "@/features/status/model/selectors";
import { confirmAction } from "@/shared/lib/confirmAction";
import { Button } from "@/shared/ui/primitives";

export function OverviewActions() {
  const dispatch = useAppDispatch();
  const isRefreshing = useAppSelector(selectStatusRefreshing);

  return (
    <div className="cb-btn-row">
      <Button
        variant="primary"
        disabled={isRefreshing}
        onClick={() => void dispatch(refreshStatus(true))}
      >
        刷新状态
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          confirmAction({
            title: "确认重启设备？",
            content: "重启后应用永久证书变更并清理临时层。",
            okText: "重启",
            danger: true,
            onOk: () => dispatch(requestReboot()),
          })
        }
      >
        重启
      </Button>
    </div>
  );
}
