import { useTranslation } from "react-i18next";
import { ACCENTS } from "@/shared/config/theme";
import { Segment } from "@/shared/ui/primitives";

type AccentPickerRowProps = {
  value: string;
  onChange: (value: string) => void;
};

export function AccentPickerRow({ value, onChange }: AccentPickerRowProps) {
  const { t } = useTranslation("webui");
  return (
    <div className="bf-appearance__row">
      <Segment
        value={value}
        options={ACCENTS.map((accent) => ({
          value: accent.id,
          label: t(accent.labelKey),
        }))}
        onChange={onChange}
      />
    </div>
  );
}
