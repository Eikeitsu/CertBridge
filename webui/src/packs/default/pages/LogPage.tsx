import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  clearActivityLog,
  fetchActivityLog,
} from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { filterLogEntries, parseLogText } from "@/shared/lib/log";
import { LogLevel } from "@/entities/module/enums";
import { Loader } from "@/shared/ui/Loader";
import { DEFAULT_VOICE } from "../voice";

const LEVELS: { id: string; label: string }[] = [
  { id: "", label: "全部" },
  { id: LogLevel.Info, label: "信息" },
  { id: LogLevel.Warn, label: "警告" },
  { id: LogLevel.Error, label: "错误" },
  { id: LogLevel.Debug, label: "调试" },
];

export function DefaultLogPage() {
  const dispatch = useAppDispatch();
  const { text, loading, bytes, lines } = useAppSelector(selectActivityLog);
  const [levelFilter, setLevelFilter] = useLogLevelFilter();
  const v = DEFAULT_VOICE.log;
  const entries = useMemo(() => parseLogText(text), [text]);
  const filtered = useMemo(
    () => filterLogEntries(entries, levelFilter),
    [entries, levelFilter],
  );

  return (
    <div className="pk-def-page">
      <header className="pk-def-pagehead">
        <h1>{v.title}</h1>
        <p>
          {lines ? `最近 ${lines} 行` : v.empty}
          {bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""}
        </p>
      </header>

      <div className="pk-def-toolbar">
        <div className="pk-def-seg">
          {LEVELS.map((lv) => (
            <button
              key={lv.id || "all"}
              type="button"
              className={`pk-def-seg__item${levelFilter === lv.id ? " is-on" : ""}`}
              onClick={() => setLevelFilter(lv.id)}
            >
              {lv.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pk-def-toolbar">
        <button
          type="button"
          className="pk-def-btn is-primary"
          onClick={async () => {
            const action = await dispatch(fetchActivityLog());
            if (fetchActivityLog.fulfilled.match(action))
              toast(v.refresh, "ok");
          }}
        >
          {v.refresh}
        </button>
        <button
          type="button"
          className="pk-def-btn is-ghost"
          onClick={() =>
            confirmAction({
              title: "确认清空日志？",
              content: "仅清除本机日志文件，不影响证书配置。",
              okText: v.clear,
              danger: true,
              onOk: () => dispatch(clearActivityLog()),
            })
          }
        >
          {v.clear}
        </button>
      </div>

      {loading ? (
        <Loader label="读取日志…" />
      ) : filtered.length ? (
        <div className="pk-def-log">
          {filtered.map((line, i) => (
            <div
              key={`${i}-${line.raw}`}
              className={`pk-def-log__line lv-${line.level}`}
            >
              [{line.level.toUpperCase()}] {line.body}
            </div>
          ))}
        </div>
      ) : (
        <p className="pk-def-empty">
          {levelFilter ? "没有该等级的日志" : v.empty}
        </p>
      )}
    </div>
  );
}
