import { useMemo } from "react";
import { Button, Space, Tag } from "antd-mobile";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { selectThemePack } from "@/features/theme/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { filterLogEntries, parseLogText } from "@/shared/lib/log";
import { LOG_LEVEL_PRESETS } from "@/shared/config/log";
import { getPackVoice } from "@/shared/config/packVoice";
import { PageRefresh } from "@/shared/ui/PageRefresh";
import { Loader } from "@/shared/ui/Loader";
import { LogLines } from "./LogLines";

export function LogPage() {
  const dispatch = useAppDispatch();
  const pack = useAppSelector(selectThemePack);
  const voice = getPackVoice(pack);
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

  const meta = `${lines ? `最近 ${lines} 行` : voice.logEmpty}${
    bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""
  }`;

  return (
    <PageRefresh onRefresh={handleRefresh}>
      <div className={`cb-log-page pack-${pack}`}>
        <div className="cb-log-toolbar">
          <div>
            <h2 className="cb-log-title">{voice.logTitle}</h2>
            <p className="cb-log-meta">{meta}</p>
          </div>
          <Space>
            <Button size="small" fill="outline" onClick={() => void handleRefresh()}>
              刷新
            </Button>
            <Button size="small" color="danger" fill="outline" onClick={handleClear}>
              清空
            </Button>
          </Space>
        </div>

        <div className="cb-log-filters" role="radiogroup" aria-label="日志等级">
          {LOG_LEVEL_PRESETS.map((option) => {
            const on = levelFilter === option.id;
            return (
              <button
                key={option.id || "__all"}
                type="button"
                className="cb-log-filter"
                aria-checked={on}
                role="radio"
                onClick={() => setLevelFilter(option.id)}
              >
                <Tag color={on ? "primary" : "default"} fill={on ? "solid" : "outline"} round>
                  {option.label}
                </Tag>
              </button>
            );
          })}
        </div>

        <div className={`cb-log-console${loading ? " is-loading" : ""}`}>
          {loading ? (
            <div className="cb-log-loading">
              <Loader label="读取中" />
            </div>
          ) : null}
          <LogLines entries={filteredEntries} filtered={Boolean(levelFilter)} />
        </div>
      </div>
    </PageRefresh>
  );
}
