import { useMemo } from "react";
import { Button } from "antd-mobile";
import { DeleteOutline, LoopOutline } from "antd-mobile-icons";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { filterLogEntries, parseLogText } from "@/shared/lib/log";
import { PageRefresh, PageSpin, SectionLabel } from "@/shared/ui";
import { LogFilter } from "./LogFilter";
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
    <PageRefresh onRefresh={handleRefresh}>
      <div className="cb-log-page">
        <div className="cb-list-group__head">
          <SectionLabel>安装 / 注入日志</SectionLabel>
          <div className="cb-console__actions">
            <Button size="mini" fill="outline" onClick={() => void handleRefresh()}>
              <LoopOutline />
              刷新
            </Button>
            <Button size="mini" fill="outline" color="danger" onClick={handleClear}>
              <DeleteOutline />
              清空
            </Button>
          </div>
        </div>
        <p className="cb-list-group__meta">{meta}</p>
        <LogFilter value={levelFilter} onChange={setLevelFilter} />
        <PageSpin spinning={loading}>
          <div className="cb-log-view">
            <div className="cb-log-view__chrome" aria-hidden>
              <i />
              <i />
              <i />
            </div>
            <LogLines entries={filteredEntries} filtered={Boolean(levelFilter)} />
          </div>
        </PageSpin>
      </div>
    </PageRefresh>
  );
}
