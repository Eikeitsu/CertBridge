import { LOG_LEVEL_PRESETS } from "@/shared/config/log";
import { LogLevel } from "@/entities/module/enums";

type LogFilterProps = {
  value: string;
  onChange: (value: string) => void;
};

const TONE: Record<string, string> = {
  "": "all",
  [LogLevel.Info]: "info",
  [LogLevel.Warn]: "warn",
  [LogLevel.Error]: "error",
  [LogLevel.Debug]: "debug",
};

export function LogFilter({ value, onChange }: LogFilterProps) {
  return (
    <div className="cb-log-filter" role="radiogroup" aria-label="日志等级">
      {LOG_LEVEL_PRESETS.map((option) => (
        <button
          key={option.id || "__all"}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className={`cb-log-filter__seg tone-${TONE[option.id] || "all"}${value === option.id ? " active" : ""}`}
          onClick={() => onChange(option.id)}
        >
          <i className="cb-log-filter__dot" aria-hidden="true" />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
