import { useTranslation } from "react-i18next";
import { Row, Switch } from "@/shared/ui/primitives";

type HotMountAllowRowProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function HotMountAllowRow({ checked, disabled, onChange }: HotMountAllowRowProps) {
  const { t } = useTranslation("webui");

  return (
    <Row
      title={t("certs.hotAllowTitle")}
      desc={t("certs.hotAllowDesc")}
      extra={<Switch checked={checked} disabled={disabled} onChange={onChange} />}
    />
  );
}
