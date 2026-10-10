import { HideAllowRow } from "./HideAllowRow";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import type { ZnFilterMode } from "@/shared/api/cli";

type ZnFilterModeRowProps = {
  mode: ZnFilterMode;
  disabled?: boolean;
  onChange: (mode: ZnFilterMode) => void;
};

/** 黑名单=默认安全；切白名单用开关呈现（关=黑名单，开=白名单） */
export function ZnFilterModeRow({ mode, disabled, onChange }: ZnFilterModeRowProps) {
  const { voice } = usePackVoice();
  const h = voice.hide;
  const whitelistOn = mode === "whitelist";

  return (
    <HideAllowRow
      checked={whitelistOn}
      disabled={!!disabled}
      onChange={(next) => onChange(next ? "whitelist" : "blacklist")}
      title={h.filterModeTitle}
      descOn={h.filterModeWhitelist}
      descOff={h.filterModeBlacklist}
    />
  );
}
