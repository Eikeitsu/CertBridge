import { Segment } from "@/shared/ui/primitives";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import type { ZnFilterMode } from "@/shared/api/cli";

type ZnFilterModeRowProps = {
  mode: ZnFilterMode;
  disabled?: boolean;
  onChange: (mode: ZnFilterMode) => void;
};

/** 黑/白名单用分段选择，避免「开=白名单」开关语义含糊 */
export function ZnFilterModeRow({ mode, disabled, onChange }: ZnFilterModeRowProps) {
  const { voice } = usePackVoice();
  const h = voice.hide;

  return (
    <div className="bf-zn-mode">
      <div className="bf-zn-mode__label">{h.filterModeTitle}</div>
      <Segment
        layout="stack"
        value={mode}
        disabled={disabled}
        onChange={(v) => onChange(v === "whitelist" ? "whitelist" : "blacklist")}
        options={[
          {
            value: "blacklist",
            label: h.filterModeBlacklist,
            hint: h.filterModeBlacklistHint,
          },
          {
            value: "whitelist",
            label: h.filterModeWhitelist,
            hint: h.filterModeWhitelistHint,
          },
        ]}
      />
    </div>
  );
}
