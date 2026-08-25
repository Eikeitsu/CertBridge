import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { filterLogEntries, parseLogText } from "@/shared/lib/log";
import { PageStack } from "@/shared/ui/layout";
import { Card } from "@/shared/ui/primitives";
import { LogToolbar } from "./LogToolbar";
import { LogViewer } from "./LogViewer";

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
    if (fetchActivityLog.fulfilled.match(action)) toast("日志已刷新", "ok");
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

  const meta = `${lines ? `最近 ${lines} 行` : "暂无日志"}${bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""}`;

  return (
    <PageStack>
      <Card title="安装 / 注入日志" meta={meta}>
        <LogToolbar
          levelFilter={levelFilter}
          onLevelChange={setLevelFilter}
          onRefresh={() => void handleRefresh()}
          onClear={handleClear}
        />
        <LogViewer loading={loading} entries={filteredEntries} levelFilter={levelFilter} />
      </Card>
    </PageStack>
  );
}
