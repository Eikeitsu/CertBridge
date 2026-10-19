import { useMemo, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { clearActivityLog, fetchActivityLog } from "@/features/log/model/logSlice";
import { selectActivityLog } from "@/features/log/model/selectors";
import { useLogLevelFilter } from "@/features/log/hooks/useLogLevelFilter";
import { useLogWrap } from "@/features/log/hooks/useLogWrap";
import { useEnsureActivityLog } from "@/features/log/hooks/useEnsureActivityLog";
import { formatByteSize } from "@/features/log/lib/formatByteSize";
import { filterLogEntries, parseLogText } from "@/shared/lib/log";
import { LogLevel } from "@/entities/module/enums";
import { usePackChrome } from "@/features/theme/hooks/usePackChrome";

/** 三套 pack Log 页共用的数据与过滤 */
export function useLogPageModel() {
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

  return {
    t,
    chrome,
    dispatch,
    text,
    loading,
    bytes,
    lines,
    levelFilter,
    setLevelFilter,
    wrap,
    setWrap,
    v,
    entries,
    filtered,
    parsing,
    levels,
    formatByteSize,
    clearActivityLog,
    fetchActivityLog,
  };
}
