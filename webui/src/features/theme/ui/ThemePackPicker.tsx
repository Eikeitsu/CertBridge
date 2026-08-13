import { Grid } from "antd-mobile";
import type { ThemePack } from "@/entities/module/enums";
import { FieldLabel, Stack } from "@/shared/ui";

type PackOption = {
  value: ThemePack;
  label: string;
  hint: string;
};

type ThemePackPickerProps = {
  value: ThemePack;
  options: PackOption[];
  onChange: (pack: ThemePack) => void;
};

export function ThemePackPicker({ value, options, onChange }: ThemePackPickerProps) {
  return (
    <Stack>
      <FieldLabel>主题包</FieldLabel>
      <div className="cb-theme-grid" role="radiogroup" aria-label="主题包">
        <Grid columns={3} gap={8}>
          {options.map((option) => (
            <Grid.Item key={option.value}>
              <button
                type="button"
                role="radio"
                aria-checked={value === option.value}
                className={`cb-theme-card${value === option.value ? " active" : ""}`}
                onClick={() => onChange(option.value)}
              >
                <div className="cb-theme-preview" data-pack={option.value} aria-hidden />
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            </Grid.Item>
          ))}
        </Grid>
      </div>
    </Stack>
  );
}
