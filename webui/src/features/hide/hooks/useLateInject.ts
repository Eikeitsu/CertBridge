import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { setLateInject } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { confirmAction } from "@/shared/lib/confirmAction";
import { parseKv } from "@/shared/lib/parse";
import { isFlagOn } from "@/shared/lib/flag";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";

const SILENT_REFRESH = { syncApps: false } as const;

export function useLateInject() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const { isPending, runExclusive } = useAsyncLock();
  const lateInject = isFlagOn(status.late_inject);

  const handleChange = useCallback(
    (checked: boolean) => {
      const apply = () => {
        dispatch(patchStatus({ late_inject: checked ? FLAG_ON : FLAG_OFF }));
        toast(checked ? h.lateInjectToastOn : h.lateInjectToastOff, "ok");
        void runExclusive(async () => {
          const result = await setLateInject(checked ? FLAG_ON : FLAG_OFF);
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
          title: h.lateInjectConfirmOnTitle,
          content: h.lateInjectConfirmOnBody,
          okText: h.lateInjectConfirmOnOk,
          danger: true,
          onOk: apply,
        });
        return;
      }

      apply();
    },
    [dispatch, runExclusive, h],
  );

  return { lateInject, isPending, handleChange };
}
