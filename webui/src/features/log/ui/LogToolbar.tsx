import { LOG_LEVEL_PRESETS } from "@/shared/config/log";
import { Button, Segment } from "@/shared/ui/primitives";

type LogToolbarProps = {
  levelFilter: string;
  onLevelChange: (filter: string) => void;
  onRefresh: () => void;
  onClear: () => void;
};

export function LogToolbar({
  levelFilter,
  onLevelChange,
  onRefresh,
  onClear,
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
          刷新
        </Button>
        <Button onClick={onClear}>清空</Button>
      </div>
    </>
  );
}
