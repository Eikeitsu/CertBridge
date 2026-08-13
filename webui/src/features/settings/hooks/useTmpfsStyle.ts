import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { refreshStatus } from "@/features/status/model/statusSlice";
import { setTmpfsStyle } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { parseKv } from "@/shared/lib/parse";
import { toastByRebootFlag } from "@/shared/lib/rebootToast";
import { parseEnum } from "@/shared/lib/enum";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import { TmpfsStyle } from "@/entities/module/enums";

export function useTmpfsStyle() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { isPending, runExclusive } = useAsyncLock();
  const tmpfsStyle = parseEnum(TmpfsStyle, status.tmpfs_style, TmpfsStyle.Short);

  const handleChange = useCallback(
    async (style: TmpfsStyle) => {
      await runExclusive(async () => {
        const result = await setTmpfsStyle(style);
        if (isCliFailure(result)) {
          toast(errorFromResult(result.stdout, result.stderr));
          return;
        }
        const kv = parseKv(result.stdout || "");
        toastByRebootFlag(
          kv,
          "临时路径风格已更新，重启后生效",
          "临时路径风格已恢复为当前生效配置",
        );
        await dispatch(refreshStatus(false));
      });
    },
    [dispatch, runExclusive],
  );

  return { tmpfsStyle, isPending, handleChange };
}
