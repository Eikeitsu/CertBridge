import type { TmpfsStyle } from "@/entities/module/enums";
import {
  TMPFS_HELP_FOOTNOTE,
  TMPFS_STYLE_OPTIONS,
  TMPFS_STYLES,
} from "@/shared/config/mount";
import { HelpCollapse, Panel, Segmented } from "@/shared/ui";

type TmpfsPathPanelProps = {
  tmpfsStyle: TmpfsStyle;
  pending?: boolean;
  onChange: (style: TmpfsStyle) => void;
};

export function TmpfsPathPanel({ tmpfsStyle, pending, onChange }: TmpfsPathPanelProps) {
  return (
    <Panel title="临时挂载路径" meta={TMPFS_STYLES[tmpfsStyle].meta}>
      <Segmented
        value={tmpfsStyle}
        disabled={pending}
        onChange={onChange}
        options={TMPFS_STYLE_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        }))}
      />
      <HelpCollapse title="路径说明" inset>
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
      </HelpCollapse>
    </Panel>
  );
}
