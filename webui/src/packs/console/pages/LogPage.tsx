import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { useLogWrap } from "@/features/log/hooks/useLogWrap";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { filterLogEntries, parseLogText } from "@/shared/lib/log";
import { LogLevel } from "@/entities/module/enums";
import { Loader } from "@/shared/ui/Loader";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

const LEVELS = ["", LogLevel.Info, LogLevel.Warn, LogLevel.Error, LogLevel.Debug];

export function ConsoleLogPage() {
  const { t } = useTranslation("webui");
  const chrome = usePackChrome();
  const dispatch = useAppDispatch();
  const { text, loading, bytes, lines } = useAppSelector(selectActivityLog);
  const [levelFilter, setLevelFilter] = useLogLevelFilter();
  const [wrap, setWrap] = useLogWrap();
  const v = chrome.log;
  const entries = useMemo(() => parseLogText(text), [text]);
  const filtered = useMemo(
    () => filterLogEntries(entries, levelFilter),
    [entries, levelFilter],
  );

  const levelLabel = (lv: string) => {
    if (!lv) return t("log.levelAll");
    if (lv === LogLevel.Info) return t("log.levelInfo");
    if (lv === LogLevel.Warn) return t("log.levelWarn");
    if (lv === LogLevel.Error) return t("log.levelError");
    if (lv === LogLevel.Debug) return t("log.levelDebug");
    return lv;
  };

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
            {levelLabel(lv)}
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
              title: t("log.clearConfirmTitle"),
              content: t("log.clearConfirmBody"),
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
        <Loader label={t("log.loading")} />
      ) : (
        <section className="pk-con-termframe">
          <div className="pk-con-termframe__bar">
            <span>journal · {t("log.linesCount", { count: filtered.length })}</span>
            <button
              type="button"
              className="pk-con-termframe__flag"
              aria-pressed={wrap}
              onClick={() => setWrap(!wrap)}
            >
              {t("log.wrap")}={wrap ? "on" : "off"}
            </button>
          </div>
          <pre className={`pk-con-term${wrap ? "" : " is-nowrap"}`}>
            {filtered.length
              ? filtered.map((l) => `[${l.level}] ${l.body}`).join("\n")
              : v.empty}
          </pre>
        </section>
      )}
    </div>
  );
}
