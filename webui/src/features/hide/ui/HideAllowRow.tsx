import { Row, Switch } from "@/shared/ui/primitives";

type HideAllowRowProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
  descOn?: string;
  descOff?: string;
  large?: boolean;
};

export function HideAllowRow({
  checked,
  disabled,
  onChange,
  title = "启用挂载隐藏协助",
  descOn = "注入 / 热挂载成功后登记 SuSFS try_umount",
  descOff = "关闭时不写隐藏状态、不注册 umount",
  large,
}: HideAllowRowProps) {
  if (large) {
    return (
      <div className="cb-hide-switch-card">
        <div className="cb-hide-switch-card__text">
          <div className="cb-row__title">{title}</div>
          <div className="cb-row__desc">{checked ? descOn : descOff}</div>
        </div>
        <Switch checked={checked} disabled={disabled} onChange={onChange} />
      </div>
    );
  }

  return (
    <Row
      title={title}
      desc={checked ? descOn : descOff}
      extra={<Switch checked={checked} disabled={disabled} onChange={onChange} />}
    />
  );
}
