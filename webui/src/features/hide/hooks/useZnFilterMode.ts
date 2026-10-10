import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { setZnFilterMode, type ZnFilterMode } from "@/shared/api/cli";
import { errorFromResult } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";
import { isCliFailure } from "@/shared/lib/cliResult";
import { useAsyncLock } from "@/shared/hooks/useAsyncLock";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";

function parseMode(raw: string | undefined): ZnFilterMode {
  return raw === "whitelist" ? "whitelist" : "blacklist";
}

export function useZnFilterMode() {
  const status = useAppSelector(selectModuleStatus);
  const { voice } = usePackVoice();
  const h = voice.hide;
  const [mode, setMode] = useState<ZnFilterMode>(() => parseMode(status.zn_filter_mode));
  const { isPending, runExclusive } = useAsyncLock();

  useEffect(() => {
    setMode(parseMode(status.zn_filter_mode));
  }, [status.zn_filter_mode]);

  const handleChange = useCallback(
    (next: ZnFilterMode) => {
      void runExclusive(async () => {
        const result = await setZnFilterMode(next);
        if (isCliFailure(result)) {
          toast(errorFromResult(result.stdout, result.stderr), "bad");
          return;
        }
        setMode(next);
        toast(
          next === "whitelist" ? h.filterModeToastWhitelist : h.filterModeToastBlacklist,
          "ok",
        );
      });
    },
    [runExclusive, h.filterModeToastWhitelist, h.filterModeToastBlacklist],
  );

  return { mode, isPending, handleChange };
}
