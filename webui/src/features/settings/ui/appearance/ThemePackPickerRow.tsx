import type { ThemePack } from "@/entities/module/enums";
import { PACK_OPTIONS } from "@/shared/config/theme";
import { ListGroup, Segment } from "@/shared/ui/primitives";

type ThemePackPickerRowProps = {
  value: ThemePack;
  onChange: (value: ThemePack) => void;
  previewCards?: boolean;
};

export function ThemePackPickerRow({
  value,
  onChange,
  previewCards,
}: ThemePackPickerRowProps) {
  if (previewCards) {
    return (
      <div className="cb-theme-grid" role="radiogroup" aria-label="主题包">
        {PACK_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`cb-theme-card${value === option.value ? " is-active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            <div className="cb-theme-preview" data-pack={option.value} aria-hidden />
            <strong>{option.label}</strong>
            <span>{option.hint}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <ListGroup label="主题包">
      <Segment
        value={value}
        options={PACK_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
          hint: option.hint,
        }))}
        onChange={(next) => onChange(next as ThemePack)}
      />
    </ListGroup>
  );
}
