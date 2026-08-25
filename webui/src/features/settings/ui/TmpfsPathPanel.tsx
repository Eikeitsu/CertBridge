import type { TmpfsStyle } from "@/entities/module/enums";
import {
  TMPFS_HELP_FOOTNOTE,
  TMPFS_STYLE_OPTIONS,
} from "@/shared/config/mount";
import { Card, Segment } from "@/shared/ui/primitives";

type TmpfsPathPanelProps = {
  tmpfsStyle: TmpfsStyle;
  pending?: boolean;
  onChange: (style: TmpfsStyle) => void;
};

export function TmpfsPathPanel({ tmpfsStyle, pending, onChange }: TmpfsPathPanelProps) {
  return (
    <Card title="临时挂载路径" meta={TMPFS_HELP_FOOTNOTE}>
      <Segment
        value={tmpfsStyle}
        disabled={pending}
        options={TMPFS_STYLE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
          hint: option.paths.join(" / "),
        }))}
        onChange={(value) => onChange(value as TmpfsStyle)}
      />
    </Card>
  );
}
