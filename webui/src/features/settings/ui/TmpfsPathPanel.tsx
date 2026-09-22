import { useTranslation } from "react-i18next";
import { TmpfsStyle } from "@/entities/module/enums";
import { TMPFS_STYLE_OPTIONS } from "@/shared/config/mount";
import { Card, Segment } from "@/shared/ui/primitives";

type TmpfsPathPanelProps = {
  tmpfsStyle: TmpfsStyle;
  pending?: boolean;
  onChange: (style: TmpfsStyle) => void;
  dense?: boolean;
  surface?: "card" | "plain";
};

export function TmpfsPathPanel({
  tmpfsStyle,
  pending,
  onChange,
  dense,
  surface = "card",
}: TmpfsPathPanelProps) {
  const { t } = useTranslation("webui");
  return (
    <Card
      title={t("more.tmpfsPath")}
      meta={t("more.mountConfig.tmpfsFootnote")}
      surface={surface}
      className={dense ? "bf-card--dense" : undefined}
    >
      <Segment
        value={tmpfsStyle}
        disabled={pending}
        options={TMPFS_STYLE_OPTIONS.map((option) => ({
          value: option.value,
          label: t(option.labelKey),
          hint: t(option.metaKey),
        }))}
        onChange={(value) => onChange(value as TmpfsStyle)}
      />
    </Card>
  );
}
