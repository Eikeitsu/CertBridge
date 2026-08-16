import { useMemo } from "react";
import { Button, Card, Grid, NoticeBar, Space, Tag } from "antd-mobile";
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

  const levelStats = useMemo(() => {
    const stats = { info: 0, warn: 0, error: 0, debug: 0 };
    for (const entry of entries) {
      if (entry.level in stats) {
        stats[entry.level as keyof typeof stats] += 1;
      }
    }
    return stats;
  }, [entries]);

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
        <NoticeBar
          color={levelStats.error > 0 ? "error" : levelStats.warn > 0 ? "alert" : "info"}
          content={
            levelStats.error > 0
              ? `检测到 ${levelStats.error} 条错误日志，建议优先排查。`
              : `共 ${entries.length} 条解析记录 · ${meta}`
          }
        />

        <Card className="cb-log-head" title={voice.logTitle} extra={meta}>
          <Grid columns={4} gap={8}>
            {(
              [
                ["信息", levelStats.info],
                ["警告", levelStats.warn],
                ["错误", levelStats.error],
                ["调试", levelStats.debug],
              ] as const
            ).map(([label, value]) => (
              <Grid.Item key={label}>
                <div className="cb-log-stat">
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              </Grid.Item>
            ))}
          </Grid>
          <Space style={{ marginTop: 12 }}>
            <Button size="small" fill="outline" onClick={() => void handleRefresh()}>
              刷新
            </Button>
            <Button size="small" color="danger" fill="outline" onClick={handleClear}>
              清空
            </Button>
          </Space>
        </Card>

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
