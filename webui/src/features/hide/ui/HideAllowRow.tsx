import { useTranslation } from "react-i18next";
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
  title,
  descOn,
  descOff,
  large,
}: HideAllowRowProps) {
  const { t } = useTranslation("webui");
  const resolvedTitle = title ?? t("hide.allowTitle");
  const resolvedDescOn = descOn ?? t("hide.allowOn");
  const resolvedDescOff = descOff ?? t("hide.allowOff");
  if (large) {
    return (
      <div className="bf-hide-switch-card">
        <div className="bf-hide-switch-card__text">
          <div className="bf-row__title">{resolvedTitle}</div>
          <div className="bf-row__desc">{checked ? resolvedDescOn : resolvedDescOff}</div>
        </div>
        <Switch checked={checked} disabled={disabled} onChange={onChange} />
      </div>
    );
  }

  return (
    <Row
      title={resolvedTitle}
      desc={checked ? resolvedDescOn : resolvedDescOff}
      extra={<Switch checked={checked} disabled={disabled} onChange={onChange} />}
    />
  );
}
