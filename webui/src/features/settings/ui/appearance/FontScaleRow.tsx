import { Row } from "@/shared/ui/primitives";

type FontScaleRowProps = {
  value: number;
  onChange: (value: number) => void;
};

export function FontScaleRow({ value, onChange }: FontScaleRowProps) {
  return (
    <Row
      title="字号"
      extra={
        <input
          type="range"
          min={0.85}
          max={1.15}
          step={0.05}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      }
    />
  );
}
