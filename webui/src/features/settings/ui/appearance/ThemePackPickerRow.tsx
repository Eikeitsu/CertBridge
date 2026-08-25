import type { ThemePack } from "@/entities/module/enums";
import { PACK_OPTIONS } from "@/shared/config/theme";
import { ListGroup, Segment } from "@/shared/ui/primitives";

type ThemePackPickerRowProps = {
  value: ThemePack;
  onChange: (value: ThemePack) => void;
};

export function ThemePackPickerRow({ value, onChange }: ThemePackPickerRowProps) {
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
