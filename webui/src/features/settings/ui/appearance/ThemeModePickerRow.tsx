import type { ThemeMode } from "@/entities/module/enums";
import { THEME_MODE_OPTIONS } from "@/shared/config/theme";
import { Segment } from "@/shared/ui/primitives";

type ThemeModePickerRowProps = {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
};

export function ThemeModePickerRow({ value, onChange }: ThemeModePickerRowProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <Segment
        value={value}
        options={THEME_MODE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        onChange={(next) => onChange(next as ThemeMode)}
      />
    </div>
  );
}
