import { List, Selector } from "antd-mobile";
import type { TmpfsStyle } from "@/entities/module/enums";
import {
  TMPFS_HELP_FOOTNOTE,
  TMPFS_STYLE_OPTIONS,
  TMPFS_STYLES,
} from "@/shared/config/mount";
import { HelpCollapse } from "@/shared/ui/HelpCollapse";
import { ListGroup } from "@/shared/ui/ListGroup";

type TmpfsPathPanelProps = {
  tmpfsStyle: TmpfsStyle;
  pending?: boolean;
  onChange: (style: TmpfsStyle) => void;
};

export function TmpfsPathPanel({ tmpfsStyle, pending, onChange }: TmpfsPathPanelProps) {
  return (
    <ListGroup title="临时挂载路径" meta={TMPFS_STYLES[tmpfsStyle].meta}>
      <List.Item>
        <Selector
          columns={1}
          disabled={pending}
          value={[tmpfsStyle]}
          onChange={(arr) => {
            const next = arr[0];
            if (next) onChange(next as TmpfsStyle);
          }}
          options={TMPFS_STYLE_OPTIONS.map((option) => ({
            label: option.label,
            description: option.paths.join(" / "),
            value: option.value,
          }))}
        />
      </List.Item>
      <List.Item>
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
      </List.Item>
    </ListGroup>
  );
}
