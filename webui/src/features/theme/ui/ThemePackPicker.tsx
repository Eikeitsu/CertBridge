import type { CSSProperties } from "react";
import type { ThemePack } from "@/entities/module/enums";
import { ACCENTS } from "@/shared/config/theme";

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
    <div>
      <p className="cb-field-label">主题包</p>
      <div className="cb-theme-grid" role="radiogroup" aria-label="主题包">
        {options.map((option) => (
          <button
            key={option.value}
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
        ))}
      </div>
    </div>
  );
}

type AccentPickerProps = {
  value: string;
  onChange: (accentId: string) => void;
};

export function AccentPicker({ value, onChange }: AccentPickerProps) {
  return (
    <div>
      <p className="cb-field-label">强调色</p>
      <div className="accent-row">
        {ACCENTS.map((accent) => (
          <button
            key={accent.id}
            type="button"
            title={accent.label}
            className={`accent-dot${value === accent.id ? " active" : ""}`}
            style={
              {
                background: accent.color,
                "--accent-swatch": accent.color,
              } as CSSProperties
            }
            onClick={() => onChange(accent.id)}
          />
        ))}
      </div>
    </div>
  );
}
