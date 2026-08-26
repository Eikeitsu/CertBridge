import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
import { setZnHideAllow } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { confirmAction } from "@/shared/lib/confirmAction";
import { parseKv } from "@/shared/lib/parse";
import { isFlagOn } from "@/shared/lib/flag";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";

const SILENT_REFRESH = { syncApps: false } as const;

export function useZnHideAllow() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { isPending, runExclusive } = useAsyncLock();
  const znHideAllow = isFlagOn(status.zn_hide_allow);
  const znHideSupported = isFlagOn(status.zn_hide_supported);

  const handleChange = useCallback(
    (checked: boolean) => {
      const apply = () =>
        runExclusive(async () => {
          dispatch(patchStatus({ zn_hide_allow: checked ? FLAG_ON : FLAG_OFF }));
          const result = await setZnHideAllow(checked ? FLAG_ON : FLAG_OFF);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr), "bad");
            void dispatch(refreshStatus(SILENT_REFRESH));
            return;
          }
          const kv = parseKv(result.stdout || "");
          dispatch(mergeStatus(kv));
          toast(
            checked
              ? "已开启 Zygisk 挂载过滤（重启相关 App 后生效）"
              : "已关闭 Zygisk 挂载过滤（已运行进程需重启）",
            "ok",
          );
        });

      if (!checked) {
        confirmAction({
          title: "关闭 Zygisk 挂载过滤？",
          content:
            "关闭后新启动的 App 不再挂钩过滤 mountinfo。已运行中的进程需强停或重启后才会去掉挂钩。",
          okText: "关闭",
          danger: true,
          onOk: apply,
        });
        return;
      }

      void apply();
    },
    [dispatch, runExclusive],
  );

  return { znHideAllow, znHideSupported, isPending, handleChange };
}
