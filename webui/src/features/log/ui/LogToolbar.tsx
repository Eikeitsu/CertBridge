import { LOG_LEVEL_PRESETS } from "@/shared/config/log";
import { Button, Segment } from "@/shared/ui/primitives";

type LogToolbarProps = {
  levelFilter: string;
  onLevelChange: (filter: string) => void;
  onRefresh: () => void;
  onClear: () => void;
  refreshLabel?: string;
  clearLabel?: string;
};

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
      <Segment
        value={levelFilter}
        options={LOG_LEVEL_PRESETS.map((preset) => ({
          value: preset.id,
          label: preset.label,
        }))}
        onChange={onLevelChange}
      />
      <div className="cb-btn-row" style={{ margin: "12px 0" }}>
        <Button variant="primary" onClick={onRefresh}>
          {refreshLabel}
        </Button>
        <Button onClick={onClear}>{clearLabel}</Button>
      </div>
    </>
  );
}
