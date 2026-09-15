import { isFlagOn } from "@/shared/lib/flag";
import { parseEnum } from "@/shared/lib/enum";
import { HotMountMode } from "@/entities/module/enums";
import { HOT_MODE_LABEL } from "@/shared/config/certs";
import type { ModuleStatus } from "@/entities/module/types";

export function resolveHotSessionLabel(status: ModuleStatus): string {
  if (isFlagOn(status.hot_active)) {
    const mode = parseEnum(HotMountMode, status.hot_mode, HotMountMode.User);
    const modeLabel = HOT_MODE_LABEL[mode];
    const state = isFlagOn(status.hot_partial) ? "部分挂载" : "已挂载";
    return `${state}（${modeLabel}）`;
  }
  if (isFlagOn(status.hot_stale)) return "状态异常（建议卸载或重启）";
  return "未挂载";
}
