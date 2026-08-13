import type { CSSProperties } from "react";
import { ACCENTS } from "@/shared/config/theme";
import { FieldLabel, Stack } from "@/shared/ui";

type AccentPickerProps = {
  value: string;
  onChange: (accentId: string) => void;
};

export function AccentPicker({ value, onChange }: AccentPickerProps) {
  return (
    <Stack>
      <FieldLabel>强调色</FieldLabel>
      <div className="accent-row">
        {ACCENTS.map((accent) => (
          <button
            key={accent.id}
            type="button"
            title={accent.label}
            className={`accent-dot${value === accent.id ? " active" : ""}`}
            style={{ "--accent-swatch": accent.color } as CSSProperties}
            onClick={() => onChange(accent.id)}
          />
        ))}
      </div>
    </Stack>
  );
}
