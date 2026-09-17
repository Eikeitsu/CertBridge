import { Row, Switch } from "@/shared/ui/primitives";

type HotMountAllowRowProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function HotMountAllowRow({ checked, disabled, onChange }: HotMountAllowRowProps) {
  return (
    <Row
      title="允许临时挂载"
      desc="关闭后无法新建临时会话"
      extra={<Switch checked={checked} disabled={disabled} onChange={onChange} />}
    />
  );
}
