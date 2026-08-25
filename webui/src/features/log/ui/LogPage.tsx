import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { usePackVoice } from "@/features/theme/hooks/usePackVoice";
import { ThemePack } from "@/entities/module/enums";
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
  const { pack, voice } = usePackVoice();

  const entries = useMemo(() => parseLogText(text), [text]);
  const filteredEntries = useMemo(
    () => filterLogEntries(entries, levelFilter),
    [entries, levelFilter],
  );

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

  if (pack === ThemePack.Console) {
    return (
      <PageStack className="cb-stack--tight">
        <LogToolbar
          levelFilter={levelFilter}
          onLevelChange={setLevelFilter}
          onRefresh={() => void handleRefresh()}
          onClear={handleClear}
          refreshLabel={voice.log.refresh}
          clearLabel={voice.log.clear}
        />
        <p className="cb-page-sub" style={{ margin: 0 }}>
          {voice.log.title} · {meta}
        </p>
        <LogViewer
          loading={loading}
          entries={filteredEntries}
          levelFilter={levelFilter}
          emptyFiltered={voice.log.emptyFiltered}
          emptyAll={voice.log.emptyAll}
          terminal
        />
      </PageStack>
    );
  }

  if (pack === ThemePack.Studio) {
    return (
      <PageStack className="cb-stack--loose">
        <div>
          <h1 className="cb-page-title">{voice.log.title}</h1>
          <p className="cb-page-sub">{meta}</p>
        </div>
        <LogToolbar
          levelFilter={levelFilter}
          onLevelChange={setLevelFilter}
          onRefresh={() => void handleRefresh()}
          onClear={handleClear}
          refreshLabel={voice.log.refresh}
          clearLabel={voice.log.clear}
        />
        <Card>
          <LogViewer
            loading={loading}
            entries={filteredEntries}
            levelFilter={levelFilter}
            emptyFiltered={voice.log.emptyFiltered}
            emptyAll={voice.log.emptyAll}
          />
        </Card>
      </PageStack>
    );
  }

  return (
    <PageStack>
      <Card title={voice.log.title} meta={meta}>
        <LogToolbar
          levelFilter={levelFilter}
          onLevelChange={setLevelFilter}
          onRefresh={() => void handleRefresh()}
          onClear={handleClear}
          refreshLabel={voice.log.refresh}
          clearLabel={voice.log.clear}
        />
        <LogViewer
          loading={loading}
          entries={filteredEntries}
          levelFilter={levelFilter}
          emptyFiltered={voice.log.emptyFiltered}
          emptyAll={voice.log.emptyAll}
        />
      </Card>
    </PageStack>
  );
}
