import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { setMountMode } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import type { MountMode } from "@/entities/module/types";

export function useMountMode() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { isPending, runExclusive } = useAsyncLock();
  const mountMode: MountMode =
    status.mount_mode === "magic" ? "magic" : "compatible";

  const handleChange = useCallback(
    async (mode: MountMode) => {
      await runExclusive(async () => {
        const result = await setMountMode(mode);
        if (isCliFailure(result)) {
          toast(errorFromResult(result.stdout, result.stderr));
          return;
        }
        toast("兼容策略已更新，重启后生效");
        await dispatch(refreshStatus(false));
      });
    },
    [dispatch, runExclusive],
  );

  return { mountMode, isPending, handleChange };
}
