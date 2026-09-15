import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { filterLogEntries, parseLogText } from "@/shared/lib/log";
import { LogLevel } from "@/entities/module/enums";
import { Loader } from "@/shared/ui/Loader";
import { CONSOLE_VOICE } from "../voice";

const LEVELS = ["", LogLevel.Info, LogLevel.Warn, LogLevel.Error, LogLevel.Debug];

export function ConsoleLogPage() {
  const dispatch = useAppDispatch();
  const { text, loading, bytes, lines } = useAppSelector(selectActivityLog);
  const [levelFilter, setLevelFilter] = useLogLevelFilter();
  const v = CONSOLE_VOICE.log;
  const entries = useMemo(() => parseLogText(text), [text]);
  const filtered = useMemo(
    () => filterLogEntries(entries, levelFilter),
    [entries, levelFilter],
  );

  return (
    <div className="pk-con-page pk-con-page--log">
      <pre className="pk-con-banner">
        {`# ${v.title} lines=${lines || 0} bytes=${bytes || 0}${
          bytes ? ` (${formatByteSize(bytes)})` : ""
        }`}
      </pre>
      <div className="pk-con-actions">
        {LEVELS.map((lv) => (
          <button
            key={lv || "all"}
            type="button"
            className={`pk-con-btn${levelFilter === lv ? " is-primary" : ""}`}
            onClick={() => setLevelFilter(lv)}
          >
            {lv || "all"}
          </button>
        ))}
        <button
          type="button"
          className="pk-con-btn is-primary"
          onClick={async () => {
            const action = await dispatch(fetchActivityLog());
            if (fetchActivityLog.fulfilled.match(action)) toast(v.refresh, "ok");
          }}
        >
          {v.refresh}
        </button>
        <button
          type="button"
          className="pk-con-btn"
          onClick={() =>
            confirmAction({
              title: "truncate journal?",
              content: "only clears local log file.",
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
        <Loader label="reading…" />
      ) : (
        <pre className="pk-con-term">
          {filtered.length
            ? filtered.map((l) => `[${l.level}] ${l.body}`).join("\n")
            : v.empty}
        </pre>
      )}
    </div>
  );
}
