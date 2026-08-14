import type { MountMode } from "@/entities/module/enums";
import {
  MOUNT_HELP_FOOTNOTE,
  MOUNT_MODE_OPTIONS,
  MOUNT_MODES,
  MOUNT_ROOT_NOTES,
} from "@/shared/config/mount";
import { HelpCollapse, Panel, Segmented } from "@/shared/ui";

type MountModePanelProps = {
  mountMode: MountMode;
  pending?: boolean;
  onChange: (mode: MountMode) => void;
};

export function MountModePanel({ mountMode, pending, onChange }: MountModePanelProps) {
  return (
    <Panel title="挂载模式" meta={MOUNT_MODES[mountMode].meta}>
      <Segmented
        value={mountMode}
        disabled={pending}
        onChange={onChange}
        options={MOUNT_MODE_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        }))}
      />
      <HelpCollapse title="挂载说明" inset>
        {MOUNT_MODE_OPTIONS.map((option) => (
          <p key={option.value}>
            <strong>{option.helpTitle}</strong>
            <br />
            {option.helpBody}
          </p>
        ))}
        <ul>
          {MOUNT_ROOT_NOTES.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong>：{item.note}
            </li>
          ))}
        </ul>
        <p>{MOUNT_HELP_FOOTNOTE}</p>
      </HelpCollapse>
    </Panel>
  );
}
