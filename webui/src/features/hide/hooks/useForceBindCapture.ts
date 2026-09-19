import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { setForceBindCapture } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { confirmAction } from "@/shared/lib/confirmAction";
import { parseKv } from "@/shared/lib/parse";
import { isFlagOn } from "@/shared/lib/flag";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";

const SILENT_REFRESH = { syncApps: false } as const;

export function useForceBindCapture() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const { isPending, runExclusive } = useAsyncLock();
  const forceBind = isFlagOn(status.force_bind_capture);

  const handleChange = useCallback(
    (checked: boolean) => {
      const apply = () => {
        dispatch(patchStatus({ force_bind_capture: checked ? FLAG_ON : FLAG_OFF }));
        toast(checked ? h.forceBindToastOn : h.forceBindToastOff, "ok");
        void runExclusive(async () => {
          const result = await setForceBindCapture(checked ? FLAG_ON : FLAG_OFF);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout, result.stderr), "bad");
            void dispatch(refreshStatus(SILENT_REFRESH));
            return;
          }
          const kv = parseKv(result.stdout || "");
          dispatch(mergeStatus(kv));
        });
      };

      if (checked) {
        confirmAction({
          title: h.forceBindConfirmOnTitle,
          content: h.forceBindConfirmOnBody,
          okText: h.forceBindConfirmOnOk,
          danger: true,
          onOk: apply,
        });
        return;
      }

      apply();
    },
    [dispatch, runExclusive, h],
  );

  return { forceBind, isPending, handleChange };
}
