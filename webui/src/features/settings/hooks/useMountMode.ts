import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { patchStatus, refreshStatus } from "@/features/status/model/statusSlice";
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
  const statusMode = parseEnum(MountMode, status.mount_mode, MountMode.Compatible);
  const [draft, setDraft] = useState<MountMode | null>(null);
  const mountMode = draft ?? statusMode;

  useEffect(() => {
    if (draft && statusMode === draft) setDraft(null);
  }, [draft, statusMode]);

  const handleChange = useCallback(
    async (mode: MountMode) => {
      if (mode === mountMode || isPending) return;
      setDraft(mode);
      dispatch(patchStatus({ mount_mode: mode }));
      await runExclusive(async () => {
        const result = await setMountMode(mode);
        if (isCliFailure(result)) {
          setDraft(null);
          toast(errorFromResult(result.stdout, result.stderr), "bad");
          await dispatch(refreshStatus({ syncApps: false }));
          return;
        }
        const kv = parseKv(result.stdout || "");
        toastByRebootFlag(
          kv,
          "兼容策略已更新，重启后生效",
          "兼容策略已恢复为当前生效配置",
        );
        await dispatch(refreshStatus({ syncApps: false }));
      });
    },
    [dispatch, isPending, mountMode, runExclusive],
  );

  return { mountMode, isPending, handleChange };
}
