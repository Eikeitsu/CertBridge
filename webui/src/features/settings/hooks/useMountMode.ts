import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { setMountMode } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { parseKv } from "@/shared/lib/parse";
import { toastByRebootFlag } from "@/shared/lib/rebootToast";
import { parseEnum } from "@/shared/lib/enum";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import { MountMode } from "@/entities/module/enums";

export function useMountMode() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { isPending, runExclusive } = useAsyncLock();
  const mountMode = parseEnum(MountMode, status.mount_mode, MountMode.Compatible);

  const handleChange = useCallback(
    async (mode: MountMode) => {
      await runExclusive(async () => {
        const result = await setMountMode(mode);
        if (isCliFailure(result)) {
          toast(errorFromResult(result.stdout, result.stderr));
          return;
        }
        const kv = parseKv(result.stdout || "");
        toastByRebootFlag(
          kv,
          "兼容策略已更新，重启后生效",
          "兼容策略已恢复为当前生效配置",
        );
        await dispatch(refreshStatus(false));
      });
    },
    [dispatch, runExclusive],
  );

  return { mountMode, isPending, handleChange };
}
