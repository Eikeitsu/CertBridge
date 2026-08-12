import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { setTmpfsStyle } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import type { TmpfsStyle } from "@/entities/module/types";

export function useTmpfsStyle() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { isPending, runExclusive } = useAsyncLock();
  const tmpfsStyle: TmpfsStyle =
    status.tmpfs_style === "legacy" ? "legacy" : "short";

  const handleChange = useCallback(
    async (style: TmpfsStyle) => {
      await runExclusive(async () => {
        const result = await setTmpfsStyle(style);
        if (isCliFailure(result)) {
          toast(errorFromResult(result.stdout, result.stderr));
          return;
        }
        toast("临时路径风格已更新，重启后生效");
        await dispatch(refreshStatus(false));
      });
    },
    [dispatch, runExclusive],
  );

  return { tmpfsStyle, isPending, handleChange };
}
