import { ACCENTS } from "@/shared/config/theme";
import { Segment } from "@/shared/ui/primitives";

type AccentPickerRowProps = {
  value: string;
  onChange: (value: string) => void;
};

export function AccentPickerRow({ value, onChange }: AccentPickerRowProps) {
  return (
    <div className="bf-appearance__row">
      <Segment
        value={value}
        options={ACCENTS.map((accent) => ({
          value: accent.id,
          label: accent.label,
        }))}
        onChange={onChange}
      />
    </div>
  );
}
