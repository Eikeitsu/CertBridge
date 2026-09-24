import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
import { setQuietProp } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { parseKv } from "@/shared/lib/parse";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";

/** dynamicOn = 管理器列表写入运行状态 = quiet_prop=0 */
export function useQuietProp() {
  const { t } = useTranslation("webui");
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { isPending, runExclusive } = useAsyncLock();
  const statusQuiet = status.quiet_prop !== "0";
  const statusDynamicOn = !statusQuiet;
  const [draft, setDraft] = useState<boolean | null>(null);
  const dynamicOn = draft ?? statusDynamicOn;

  useEffect(() => {
    if (draft !== null && statusDynamicOn === draft) setDraft(null);
  }, [draft, statusDynamicOn]);

  const handleChange = useCallback(
    async (nextDynamicOn: boolean) => {
      if (nextDynamicOn === dynamicOn || isPending) return;
      setDraft(nextDynamicOn);
      const quietVal = nextDynamicOn ? "0" : "1";
      dispatch(patchStatus({ quiet_prop: quietVal }));
      await runExclusive(async () => {
        const result = await setQuietProp(nextDynamicOn ? 0 : 1);
        if (isCliFailure(result)) {
          setDraft(null);
          toast(errorFromResult(result.stdout, result.stderr), "bad");
          void dispatch(refreshStatus({ syncApps: false }));
          return;
        }
        const kv = parseKv(result.stdout || "");
        dispatch(mergeStatus(kv));
        toast(t(nextDynamicOn ? "more.quietOn" : "more.quietOff"), "ok");
      });
    },
    [dispatch, dynamicOn, isPending, runExclusive, t],
  );

  return { dynamicOn, isPending, handleChange };
}
