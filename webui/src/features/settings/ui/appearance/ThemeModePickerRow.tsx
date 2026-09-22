import { useTranslation } from "react-i18next";
import type { ThemeMode } from "@/entities/module/enums";
import { THEME_MODE_OPTIONS } from "@/shared/config/theme";
import { Segment } from "@/shared/ui/primitives";

type ThemeModePickerRowProps = {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
};

export function ThemeModePickerRow({ value, onChange }: ThemeModePickerRowProps) {
  const { t } = useTranslation("webui");
  return (
    <div className="bf-appearance__row">
      <Segment
        value={value}
        options={THEME_MODE_OPTIONS.map((option) => ({
          value: option.value,
          label: t(option.labelKey),
        }))}
        onChange={(next) => onChange(next as ThemeMode)}
      />
    </div>
  );
}
