import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { setHideAllow } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { confirmAction } from "@/shared/lib/confirmAction";
import { parseKv } from "@/shared/lib/parse";
import { isFlagOn } from "@/shared/lib/flag";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";

const SILENT_REFRESH = { syncApps: false } as const;

export function useHideAllow() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const { isPending, runExclusive } = useAsyncLock();
  const hideAllow = isFlagOn(status.hide_allow);
  const hideSupported = isFlagOn(status.hide_supported);

  const handleChange = useCallback(
    (checked: boolean) => {
      const apply = () =>
        runExclusive(async () => {
          dispatch(patchStatus({ hide_allow: checked ? FLAG_ON : FLAG_OFF }));
          const result = await setHideAllow(checked ? FLAG_ON : FLAG_OFF);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr), "bad");
            void dispatch(refreshStatus(SILENT_REFRESH));
            return;
          }
          const kv = parseKv(result.stdout || "");
          dispatch(mergeStatus(kv));
          toast(checked ? h.toastOn : h.toastOff, "ok");
        });

      if (!checked) {
        confirmAction({
          title: h.confirmOffTitle,
          content: h.confirmOffBody,
          okText: h.confirmOffOk,
          danger: true,
          onOk: apply,
        });
        return;
      }

      void apply();
    },
    [dispatch, runExclusive, h],
  );

  return { hideAllow, hideSupported, isPending, handleChange };
}
