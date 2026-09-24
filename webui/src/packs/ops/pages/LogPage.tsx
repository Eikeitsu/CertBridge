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

export function OpsLogPage() {
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
    <div className="pk-ops-page pk-ops-page--log">
      <header className="pk-ops-pagehead pk-ops-pagehead--meta">
        <p>
          {lines ? t("log.linesCount", { count: lines }) : v.empty}
          {bytes > 0 ? ` · ${formatByteSize(bytes)}` : ""}
        </p>
      </header>

      <div className="pk-ops-toolbar">
        <div className="pk-ops-chips">
          {levels.map((lv) => (
            <button
              key={lv.id || "all"}
              type="button"
              className={`pk-ops-chip${levelFilter === lv.id ? " is-on" : ""}`}
              onClick={() => setLevelFilter(lv.id)}
            >
              {lv.label}
            </button>
          ))}
        </div>
        <div className="pk-ops-actions">
          <button
            type="button"
            className="pk-ops-btn is-primary"
            onClick={async () => {
              const action = await dispatch(fetchActivityLog());
              if (fetchActivityLog.fulfilled.match(action)) toast(v.refresh, "ok");
            }}
          >
            {v.refresh}
          </button>
          <button
            type="button"
            className="pk-ops-btn"
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
          <label className={`pk-ops-check${wrap ? " is-on" : ""}`}>
            <input
              type="checkbox"
              checked={wrap}
              onChange={(e) => setWrap(e.target.checked)}
            />
            <span>{t("log.wrap")}</span>
          </label>
        </div>
      </div>

      {loading ? (
        <Loader label={t("log.loading")} />
      ) : (
        <pre className={`pk-ops-term${wrap ? "" : " is-nowrap"}`}>
          {filtered.length
            ? filtered.map((l) => `[${l.level}] ${l.body}`).join("\n")
            : v.empty}
        </pre>
      )}
    </div>
  );
}
