import { isFlagOn } from "@/shared/lib/flag";
import { parseEnum } from "@/shared/lib/enum";
import { HotMountMode } from "@/entities/module/enums";
import { HOT_MODE_LABEL_KEY } from "@/shared/config/certs";
import type { ModuleStatus } from "@/entities/module/types";
import type { TFunction } from "i18next";

export function resolveHotSessionLabel(
  status: ModuleStatus,
  t: TFunction<"webui">,
): string {
  if (isFlagOn(status.hot_active)) {
    const mode = parseEnum(HotMountMode, status.hot_mode, HotMountMode.User);
    const modeLabel = t(HOT_MODE_LABEL_KEY[mode]);
    return isFlagOn(status.hot_partial)
      ? t("certs.hotSessionPartial", { mode: modeLabel })
      : t("certs.hotSessionMounted", { mode: modeLabel });
  }
  if (isFlagOn(status.hot_stale)) return t("certs.hotSessionStale");
  return t("certs.hotSessionIdle");
}
