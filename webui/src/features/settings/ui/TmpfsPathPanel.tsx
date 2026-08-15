import type { TmpfsStyle } from "@/entities/module/enums";
import {
  TMPFS_HELP_FOOTNOTE,
  TMPFS_STYLE_OPTIONS,
  TMPFS_STYLES,
} from "@/shared/config/mount";
import { NxCard, NxChoiceCard, NxCollapse, NxSection } from "@/shared/ui";

type TmpfsPathPanelProps = {
  tmpfsStyle: TmpfsStyle;
  pending?: boolean;
  onChange: (style: TmpfsStyle) => void;
};

export function TmpfsPathPanel({ tmpfsStyle, pending, onChange }: TmpfsPathPanelProps) {
  return (
    <NxSection eyebrow="Path" title="临时挂载路径">
      <p className="nx-section-note">{TMPFS_STYLES[tmpfsStyle].meta}</p>
      <NxCard>
        <NxChoiceCard
          value={tmpfsStyle}
          disabled={pending}
          onChange={onChange}
          options={TMPFS_STYLE_OPTIONS.map((option) => ({
            value: option.value,
            title: option.label,
            body: option.paths.join(" / "),
          }))}
        />
        <NxCollapse title="路径说明">
          {TMPFS_STYLE_OPTIONS.map((option) => (
            <p key={option.value}>
              <strong>{option.helpTitle}</strong>
              <br />
              使用{" "}
              {option.paths.map((path, index) => (
                <span key={path}>
                  {index > 0 ? " / " : null}
                  <code>{path}</code>
                </span>
              ))}
              。
            </p>
          ))}
          <p>{TMPFS_HELP_FOOTNOTE}</p>
        </NxCollapse>
      </NxCard>
    </NxSection>
  );
}
