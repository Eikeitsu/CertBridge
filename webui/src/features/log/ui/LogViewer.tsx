import type { LogEntry } from "@/shared/lib/log";
import { Loader } from "@/shared/ui/primitives";

type LogViewerProps = {
  loading: boolean;
  entries: LogEntry[];
  levelFilter: string;
  emptyFiltered?: string;
  emptyAll?: string;
  terminal?: boolean;
};

export function LogViewer({
  loading,
  entries,
  levelFilter,
  emptyFiltered = "没有该等级的日志",
  emptyAll = "暂无日志（安装 / 注入 / 配置变更后才会写入）",
  terminal,
}: LogViewerProps) {
  if (loading) return <Loader label="读取日志…" />;

  if (!entries.length) {
    return <div className="cb-empty">{levelFilter ? emptyFiltered : emptyAll}</div>;
  }

  return (
    <div className={`cb-log${terminal ? " cb-log--terminal" : ""}`}>
      {entries.map((entry, index) => (
        <div key={`${index}-${entry.raw}`} className={`cb-log-line lv-${entry.level}`}>
          [{entry.level.toUpperCase()}] {entry.body}
        </div>
      ))}
    </div>
  );
}
