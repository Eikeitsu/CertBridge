import { LOG_LEVEL_PRESETS } from "@/shared/config/log";
import { LogLevel } from "@/entities/module/enums";
import { Button } from "@/shared/ui/primitives";

type LogToolbarProps = {
  levelFilter: string;
  onLevelChange: (filter: string) => void;
  onRefresh: () => void;
  onClear: () => void;
  refreshLabel?: string;
  clearLabel?: string;
};

function chipTone(id: string): string {
  if (!id) return "all";
  if (id === LogLevel.Info) return "info";
  if (id === LogLevel.Warn) return "warn";
  if (id === LogLevel.Error) return "error";
  if (id === LogLevel.Debug) return "debug";
  return "all";
}

export function LogToolbar({
  levelFilter,
  onLevelChange,
  onRefresh,
  onClear,
  refreshLabel = "刷新",
  clearLabel = "清空",
}: LogToolbarProps) {
  return (
    <>
      <div className="cb-log-chips" role="tablist" aria-label="日志等级">
        {LOG_LEVEL_PRESETS.map((preset) => {
          const on = levelFilter === preset.id;
          return (
            <button
              key={preset.id || "all"}
              type="button"
              role="tab"
              aria-selected={on}
              className={`cb-log-chip cb-log-chip--${chipTone(preset.id)}${on ? " is-on" : ""}`}
              onClick={() => onLevelChange(preset.id)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="cb-btn-row" style={{ margin: "12px 0" }}>
        <Button variant="primary" onClick={onRefresh}>
          {refreshLabel}
        </Button>
        <Button onClick={onClear}>{clearLabel}</Button>
      </div>
    </>
  );
}
