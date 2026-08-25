import type { MountMode } from "@/entities/module/enums";
import {
  MOUNT_HELP_FOOTNOTE,
  MOUNT_MODE_OPTIONS,
  MOUNT_ROOT_NOTES,
} from "@/shared/config/mount";
import { Card, Segment } from "@/shared/ui/primitives";

type MountModePanelProps = {
  mountMode: MountMode;
  pending?: boolean;
  onChange: (mode: MountMode) => void;
  dense?: boolean;
};

export function MountModePanel({
  mountMode,
  pending,
  onChange,
  dense,
}: MountModePanelProps) {
  return (
    <Card
      title="证书挂载模式"
      meta={MOUNT_HELP_FOOTNOTE}
      className={dense ? "cb-card--dense" : undefined}
    >
      <Segment
        value={mountMode}
        disabled={pending}
        options={MOUNT_MODE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
          hint: option.meta,
        }))}
        onChange={(value) => onChange(value as MountMode)}
      />
      <ul
        style={{
          margin: "12px 0 0",
          paddingLeft: "1.2em",
          fontSize: "0.78rem",
          color: "var(--cb-ink-3)",
        }}
      >
        {MOUNT_ROOT_NOTES.map((note) => (
          <li key={note.name}>
            <strong>{note.name}</strong>：{note.note}
          </li>
        ))}
      </ul>
    </Card>
  );
}
