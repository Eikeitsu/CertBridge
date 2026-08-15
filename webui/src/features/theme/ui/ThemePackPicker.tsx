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
      <p className="nx-field__label">主题包</p>
      <div className="nx-pack-grid" role="radiogroup" aria-label="主题包">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`nx-pack-card${value === option.value ? " is-on" : ""}`}
            onClick={() => onChange(option.value)}
          >
            <div className="nx-pack-preview" data-pack={option.value} aria-hidden />
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
    <div style={{ margin: "12px 0" }}>
      <p className="nx-field__label">强调色</p>
      <div className="nx-accent-row">
        {ACCENTS.map((accent) => (
          <button
            key={accent.id}
            type="button"
            title={accent.label}
            className={`nx-accent-dot${value === accent.id ? " is-on" : ""}`}
            style={{ background: accent.color } as CSSProperties}
            onClick={() => onChange(accent.id)}
          />
        ))}
      </div>
    </div>
  );
}
