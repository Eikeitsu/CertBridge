import { List, Selector } from "antd-mobile";
import type { MountMode } from "@/entities/module/enums";
import {
  MOUNT_HELP_FOOTNOTE,
  MOUNT_MODE_OPTIONS,
  MOUNT_MODES,
  MOUNT_ROOT_NOTES,
} from "@/shared/config/mount";
import { HelpCollapse } from "@/shared/ui/HelpCollapse";
import { ListGroup } from "@/shared/ui/ListGroup";

type MountModePanelProps = {
  mountMode: MountMode;
  pending?: boolean;
  onChange: (mode: MountMode) => void;
};

export function MountModePanel({ mountMode, pending, onChange }: MountModePanelProps) {
  return (
    <ListGroup title="挂载模式" meta={MOUNT_MODES[mountMode].meta}>
      <List.Item>
        <Selector
          columns={1}
          disabled={pending}
          value={[mountMode]}
          onChange={(arr) => {
            const next = arr[0];
            if (next) onChange(next as MountMode);
          }}
          options={MOUNT_MODE_OPTIONS.map((option) => ({
            label: option.label,
            description: option.helpBody,
            value: option.value,
          }))}
        />
      </List.Item>
      <List.Item>
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
      </List.Item>
    </ListGroup>
  );
}
