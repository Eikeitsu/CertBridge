import { useMemo, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { useLogWrap } from "@/features/log/hooks/useLogWrap";
import { useEnsureActivityLog } from "@/features/log/hooks/useEnsureActivityLog";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { toast } from "@/shared/api/ksu";
import { confirmAction } from "@/shared/lib/confirmAction";
import { filterLogEntries, parseLogText } from "@/shared/lib/log";
import { LogLevel } from "@/entities/module/enums";
import { Loader } from "@/shared/ui/Loader";
import { Switch } from "@/shared/ui/primitives";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

export function DefaultLogPage() {
  const { t } = useTranslation("webui");
  const chrome = usePackChrome();
  const dispatch = useAppDispatch();
  const { text, loading, bytes, lines } = useAppSelector(selectActivityLog);
  const [levelFilter, setLevelFilter] = useLogLevelFilter();
  const [wrap, setWrap] = useLogWrap();
  useEnsureActivityLog();
  const deferredText = useDeferredValue(text);
  const v = chrome.log;
  const entries = useMemo(() => parseLogText(deferredText), [deferredText]);
  const filtered = useMemo(
    () => filterLogEntries(entries, levelFilter),
    [entries, levelFilter],
  );
  const parsing = deferredText !== text;

  const levels = useMemo(
    () => [
      { id: "", label: t("log.levelAll") },
      { id: LogLevel.Info, label: t("log.levelInfo") },
      { id: LogLevel.Warn, label: t("log.levelWarn") },
      { id: LogLevel.Error, label: t("log.levelError") },
      { id: LogLevel.Debug, label: t("log.levelDebug") },
    ],
    [t],
  );

  return (
    <div className="pk-def-page">
      <header className="pk-def-pagehead">
        <h1>{v.title}</h1>
        <p>
          {lines ? t("log.linesRecent", { count: lines }) : v.empty}
          {bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""}
        </p>
      </header>

      <div className="pk-def-toolbar">
        <div className="pk-def-seg">
          {levels.map((lv) => (
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

      <div className="pk-def-group pk-def-log-wrap">
        <div className="pk-def-row">
          <div className="pk-def-row__main">
            <strong>{t("log.wrapTitle")}</strong>
            <span>{t("log.wrapMeta")}</span>
          </div>
          <Switch checked={wrap} onChange={setWrap} />
        </div>
      </div>

      <div className="pk-def-toolbar">
        <button
          type="button"
          className="pk-def-btn is-primary"
          onClick={async () => {
            const action = await dispatch(fetchActivityLog());
            if (fetchActivityLog.fulfilled.match(action)) toast(v.refresh, "ok");
          }}
        >
          {v.refresh}
        </button>
        <button
          type="button"
          className="pk-def-btn is-ghost"
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

      {loading || parsing ? (
        <Loader label={t("log.loading")} />
      ) : filtered.length ? (
        <div className={`pk-def-log${wrap ? "" : " is-nowrap"}`}>
          {filtered.map((line, i) => (
            <div key={`${i}-${line.raw}`} className={`pk-def-log__line lv-${line.level}`}>
              [{line.level.toUpperCase()}] {line.body}
            </div>
          ))}
        </div>
      ) : (
        <p className="pk-def-empty">{levelFilter ? t("log.emptyFiltered") : v.empty}</p>
      )}
    </div>
  );
}
