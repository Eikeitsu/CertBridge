import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
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
  const statusStyle = parseEnum(TmpfsStyle, status.tmpfs_style, TmpfsStyle.Short);
  const [draft, setDraft] = useState<TmpfsStyle | null>(null);
  const tmpfsStyle = draft ?? statusStyle;

  useEffect(() => {
    if (draft && statusStyle === draft) setDraft(null);
  }, [draft, statusStyle]);

  const handleChange = useCallback(
    async (style: TmpfsStyle) => {
      if (style === tmpfsStyle || isPending) return;
      setDraft(style);
      dispatch(patchStatus({ tmpfs_style: style }));
      await runExclusive(async () => {
        const result = await setTmpfsStyle(style);
        if (isCliFailure(result)) {
          setDraft(null);
          toast(errorFromResult(result.stdout, result.stderr), "bad");
          void dispatch(refreshStatus({ syncApps: false }));
          return;
        }
        const kv = parseKv(result.stdout || "");
        dispatch(mergeStatus(kv));
        toastByRebootFlag(
          kv,
          "临时路径风格已更新，重启后生效",
          "临时路径风格已恢复为当前生效配置",
        );
      });
    },
    [dispatch, isPending, runExclusive, tmpfsStyle],
  );

  return { tmpfsStyle, isPending, handleChange };
}
