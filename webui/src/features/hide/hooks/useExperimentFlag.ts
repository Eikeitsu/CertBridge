import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import {
  mergeStatus,
  patchStatus,
  refreshStatus,
} from "@/features/status/model/statusSlice";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { confirmAction } from "@/shared/lib/confirmAction";
import { parseKv } from "@/shared/lib/parse";
import { isFlagOn } from "@/shared/lib/flag";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import type { FlagValue } from "@/shared/config/constants";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import type { ExecResult, ModuleStatus } from "@/entities/module/types";

const SILENT_REFRESH = { syncApps: false } as const;

type ExperimentFlagOpts = {
  key: keyof ModuleStatus & string;
  defaultOn: boolean;
  setFn: (value: FlagValue) => Promise<ExecResult>;
  toastOn: string;
  toastOff: string;
  confirmOn?: { title: string; body: string; ok: string };
  confirmOff?: { title: string; body: string; ok: string };
};

export function useExperimentFlag({
  key,
  defaultOn,
  setFn,
  toastOn,
  toastOff,
  confirmOn,
  confirmOff,
}: ExperimentFlagOpts) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectModuleStatus);
  const { isPending, runExclusive } = useAsyncLock();
  const raw = status[key];
  const checked =
    raw === undefined || raw === ""
      ? defaultOn
      : isFlagOn(typeof raw === "string" ? raw : String(raw));

  const handleChange = useCallback(
    (next: boolean) => {
      const apply = () => {
        dispatch(patchStatus({ [key]: next ? FLAG_ON : FLAG_OFF }));
        toast(next ? toastOn : toastOff, "ok");
        void runExclusive(async () => {
          const result = await setFn(next ? FLAG_ON : FLAG_OFF);
          if (isCliFailure(result)) {
            toast(errorFromResult(result.stdout || "", result.stderr || ""), "bad");
            void dispatch(refreshStatus(SILENT_REFRESH));
            return;
          }
          const kv = parseKv(result.stdout || "");
          dispatch(mergeStatus(kv));
        });
      };

      if (next && confirmOn) {
        confirmAction({
          title: confirmOn.title,
          content: confirmOn.body,
          okText: confirmOn.ok,
          danger: true,
          onOk: apply,
        });
        return;
      }
      if (!next && confirmOff) {
        confirmAction({
          title: confirmOff.title,
          content: confirmOff.body,
          okText: confirmOff.ok,
          danger: true,
          onOk: apply,
        });
        return;
      }
      apply();
    },
    [dispatch, runExclusive, key, setFn, toastOn, toastOff, confirmOn, confirmOff],
  );

  return { checked, isPending, handleChange };
}
