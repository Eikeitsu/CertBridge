import { useMemo, useDeferredValue } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { useEnsureActivityLog } from "@/features/log/hooks/useEnsureActivityLog";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
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
  const { voice } = usePackVoice();
  useEnsureActivityLog();
  const deferredText = useDeferredValue(text);

  const entries = useMemo(() => parseLogText(deferredText), [deferredText]);
  const filteredEntries = useMemo(
    () => filterLogEntries(entries, levelFilter),
    [entries, levelFilter],
  );
  const parsing = deferredText !== text;

  const handleRefresh = async () => {
    const action = await dispatch(fetchActivityLog());
    if (fetchActivityLog.fulfilled.match(action)) toast(voice.log.refresh, "ok");
  };

  const handleClear = () => {
    confirmAction({
      title: "确认清空日志？",
      content: "仅清除本机日志文件，不影响证书配置。",
      okText: voice.log.clear,
      danger: true,
      onOk: () => dispatch(clearActivityLog()),
    });
  };

  const meta = `${lines ? `最近 ${lines} 行` : voice.log.metaEmpty}${
    bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""
  }`;

  return (
    <PageStack className="bf-stack--loose">
      <div>
        <h1 className="bf-page-title">{voice.log.title}</h1>
        <p className="bf-page-sub">{meta}</p>
      </div>
      <Card>
        <LogToolbar
          levelFilter={levelFilter}
          onLevelChange={setLevelFilter}
          onRefresh={() => void handleRefresh()}
          onClear={handleClear}
          refreshLabel={voice.log.refresh}
          clearLabel={voice.log.clear}
        />
        <LogViewer
          loading={loading || parsing}
          entries={filteredEntries}
          levelFilter={levelFilter}
          emptyFiltered={voice.log.emptyFiltered}
          emptyAll={voice.log.emptyAll}
        />
      </Card>
    </PageStack>
  );
}
