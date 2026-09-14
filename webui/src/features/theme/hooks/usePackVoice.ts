import { useMemo } from "react";
import { APP_VOICE } from "@/shared/config/packVoice";
import { ThemePack } from "@/entities/module/enums";

/** 文案已统一；pack 固定为兼容值，不再驱动布局分支 */
export function usePackVoice() {
  return useMemo(() => ({ pack: ThemePack.Settings, voice: APP_VOICE }), []);
}
