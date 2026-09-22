import { useTranslation } from "react-i18next";
import { Row } from "@/shared/ui/primitives";

type FontScaleRowProps = {
  value: number;
  onChange: (value: number) => void;
};

export function FontScaleRow({ value, onChange }: FontScaleRowProps) {
  const { t } = useTranslation("webui");
  return (
    <div className="bf-appearance__scale">
      <Row
        title={t("more.fontSize")}
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
    </div>
  );
}
