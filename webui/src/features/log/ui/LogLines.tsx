import type { LogEntry } from "@/shared/lib/log";

type LogLinesProps = {
  entries: LogEntry[];
  filtered?: boolean;
};

export function LogLines({ entries, filtered }: LogLinesProps) {
  if (!entries.length) {
    return (
      <p className="cb-log-empty">
        {filtered ? "没有该等级的日志" : "暂无日志（安装 / 注入 / 配置变更后才会写入）"}
      </p>
    );
  }

  return (
    <div className="cb-log-lines">
      {entries.map((entry, index) => (
        <div key={`${index}-${entry.raw}`} className={`cb-log-line lv-${entry.level}`}>
          <span className={`cb-log-line__tag lv-${entry.level}`}>{entry.level.toUpperCase()}</span>
          <span className="cb-log-line__body">{entry.body}</span>
        </div>
      ))}
    </div>
  );
}
