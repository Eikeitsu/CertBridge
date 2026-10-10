import { useTranslation } from "react-i18next";
import { Row, Switch } from "@/shared/ui/primitives";

type HideAllowRowProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
  /** 固定简要说明（不随开关切换） */
  note?: string;
  descOn?: string;
  descOff?: string;
  large?: boolean;
};

export function HideAllowRow({
  checked,
  disabled,
  onChange,
  title,
  note,
  descOn,
  descOff,
  large,
}: HideAllowRowProps) {
  const { t } = useTranslation("webui");
  const resolvedTitle = title ?? t("hide.allowTitle");
  const resolvedDescOn = descOn ?? t("hide.allowOn");
  const resolvedDescOff = descOff ?? t("hide.allowOff");
  const stateDesc = checked ? resolvedDescOn : resolvedDescOff;
  if (large) {
    return (
      <div className="bf-hide-switch-card">
        <div className="bf-hide-switch-card__text">
          <div className="bf-row__title">{resolvedTitle}</div>
          {note ? <div className="bf-hide-switch-card__note">{note}</div> : null}
          <div className="bf-row__desc">{stateDesc}</div>
        </div>
        <Switch checked={checked} disabled={disabled} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="bf-hide-switch-row">
      <Row
        title={resolvedTitle}
        desc={note ? undefined : stateDesc}
        extra={<Switch checked={checked} disabled={disabled} onChange={onChange} />}
      />
      {note ? (
        <div className="bf-hide-switch-row__note">
          <p>{note}</p>
          <span className="bf-hide-switch-row__state">{stateDesc}</span>
        </div>
      ) : null}
    </div>
  );
}
