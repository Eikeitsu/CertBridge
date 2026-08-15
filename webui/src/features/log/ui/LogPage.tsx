import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { filterLogEntries, parseLogText } from "@/shared/lib/log";
import { NxButton, NxChip, NxPull, NxSpin } from "@/shared/ui";
import { LOG_LEVEL_PRESETS } from "@/shared/config/log";
import { LogLines } from "./LogLines";

export function LogPage() {
  const dispatch = useAppDispatch();
  const { text, loading, bytes, lines } = useAppSelector(selectActivityLog);
  const [levelFilter, setLevelFilter] = useLogLevelFilter();

  const entries = useMemo(() => parseLogText(text), [text]);
  const filteredEntries = useMemo(
    () => filterLogEntries(entries, levelFilter),
    [entries, levelFilter],
  );

  const handleRefresh = async () => {
    const action = await dispatch(fetchActivityLog());
    if (fetchActivityLog.fulfilled.match(action)) {
      toast("日志已刷新", "ok");
    }
  };

  const handleClear = () => {
    confirmAction({
      title: "确认清空日志？",
      content: "仅清除本机日志文件，不影响证书配置。",
      okText: "清空",
      danger: true,
      onOk: () => dispatch(clearActivityLog()),
    });
  };

  const meta = `${lines ? `最近 ${lines} 行` : "暂无记录"}${
    bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""
  }`;

  return (
    <NxPull onRefresh={handleRefresh}>
      <div className="nx-log">
        <div className="nx-log__toolbar">
          <div>
            <h2 className="nx-section__title" style={{ margin: 0 }}>
              运行日志
            </h2>
            <p className="nx-log__meta">{meta}</p>
          </div>
          <div className="nx-log__actions">
            <NxButton variant="soft" onClick={() => void handleRefresh()}>
              刷新
            </NxButton>
            <NxButton variant="outline" tone="danger" onClick={handleClear}>
              清空
            </NxButton>
          </div>
        </div>

        <div className="nx-log__filters" role="radiogroup" aria-label="日志等级">
          {LOG_LEVEL_PRESETS.map((option) => {
            const on = levelFilter === option.id;
            return (
              <button
                key={option.id || "__all"}
                type="button"
                className="nx-chip-btn"
                aria-checked={on}
                role="radio"
                onClick={() => setLevelFilter(option.id)}
              >
                <NxChip tone={on ? "accent" : "neutral"}>{option.label}</NxChip>
              </button>
            );
          })}
        </div>

        <NxSpin spinning={loading}>
          <div className="nx-log__console">
            <div className="nx-log__chrome" aria-hidden>
              <i />
              <i />
              <i />
            </div>
            <LogLines entries={filteredEntries} filtered={Boolean(levelFilter)} />
          </div>
        </NxSpin>
      </div>
    </NxPull>
  );
}
