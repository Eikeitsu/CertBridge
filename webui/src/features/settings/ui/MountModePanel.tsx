import type { MountMode } from "@/entities/module/enums";
import {
  MOUNT_HELP_FOOTNOTE,
  MOUNT_MODE_OPTIONS,
  MOUNT_MODES,
  MOUNT_ROOT_NOTES,
} from "@/shared/config/mount";
import { NxCard, NxChoiceCard, NxCollapse, NxSection } from "@/shared/ui";

type MountModePanelProps = {
  mountMode: MountMode;
  pending?: boolean;
  onChange: (mode: MountMode) => void;
};

export function MountModePanel({ mountMode, pending, onChange }: MountModePanelProps) {
  return (
    <NxSection eyebrow="Mount" title="挂载模式">
      <p className="nx-section-note">{MOUNT_MODES[mountMode].meta}</p>
      <NxCard>
        <NxChoiceCard
          value={mountMode}
          disabled={pending}
          onChange={onChange}
          options={MOUNT_MODE_OPTIONS.map((option) => ({
            value: option.value,
            title: option.label,
            body: option.helpBody,
          }))}
        />
        <NxCollapse title="挂载说明">
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
        </NxCollapse>
      </NxCard>
    </NxSection>
  );
}
