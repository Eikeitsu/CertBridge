import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
import { setExperimental14System } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { parseKv } from "@/shared/lib/parse";
import { toastByRebootFlag } from "@/shared/lib/rebootToast";
import { parseEnum } from "@/shared/lib/enum";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import { Experimental14System } from "@/entities/module/enums";

export function useExperimental14System() {
  const { t } = useTranslation("webui");
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { isPending, runExclusive } = useAsyncLock();
  const statusMode = parseEnum(
    Experimental14System,
    status.experimental_14_system,
    Experimental14System.Skip,
  );
  const [draft, setDraft] = useState<Experimental14System | null>(null);
  const mode = draft ?? statusMode;

  useEffect(() => {
    if (draft && statusMode === draft) setDraft(null);
  }, [draft, statusMode]);

  const handleChange = useCallback(
    async (next: Experimental14System) => {
      if (next === mode || isPending) return;
      setDraft(next);
      dispatch(patchStatus({ experimental_14_system: next }));
      await runExclusive(async () => {
        const result = await setExperimental14System(next);
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
          next === Experimental14System.Skip
            ? t("more.systemSkipSaved")
            : t("more.systemSaved"),
          t("more.systemRestored"),
        );
      });
    },
    [dispatch, isPending, mode, runExclusive, t],
  );

  return { mode, isPending, handleChange };
}
