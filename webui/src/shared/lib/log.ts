import { LogLevel, isLogLevel } from "@/entities/module/enums";

const LEVEL_TAG = /\[(INFO|WARN|ERROR|DEBUG)\]/i;
const EMPTY_HINTS = new Set(["", "暂无日志", "暂无法读取日志"]);

export type LogEntry = {
  raw: string;
  level: LogLevel;
  /** 去掉时间戳与等级前缀后的正文，便于阅读 */
  body: string;
};

function inferLogLevel(line: string): LogLevel {
  const tagged = line.match(LEVEL_TAG);
  if (tagged) {
    const value = tagged[1].toLowerCase();
    return isLogLevel(value) ? value : LogLevel.Info;
  }

  const lower = line.toLowerCase();
  if (/failed|refuse|invalid|timeout|missing|cannot|unavailable|error/.test(lower)) {
    return LogLevel.Error;
  }
  if (/soft-fail|skipped|skip |warn|stale/.test(lower)) {
    return LogLevel.Warn;
  }
  if (/debug/.test(lower)) {
    return LogLevel.Debug;
  }
  return LogLevel.Info;
}

function stripLogPrefix(line: string): string {
  return line
    .replace(/^\[\d{4}-\d{2}-\d{2}[ T_]\d{2}:\d{2}:\d{2}\]\s*/, "")
    .replace(LEVEL_TAG, "")
    .trim();
}

export function parseLogText(text: string): LogEntry[] {
  const raw = String(text || "").trim();
  if (EMPTY_HINTS.has(raw)) return [];

  return raw
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      raw: line,
      level: inferLogLevel(line),
      body: stripLogPrefix(line) || line,
    }));
}

export function filterLogEntries(entries: LogEntry[], level: string): LogEntry[] {
  if (!level) return entries;
  return entries.filter((entry) => entry.level === level);
}

export function countLogLevels(entries: LogEntry[]): Record<LogLevel, number> {
  return entries.reduce(
    (acc, entry) => {
      acc[entry.level] += 1;
      return acc;
    },
    {
      [LogLevel.Info]: 0,
      [LogLevel.Warn]: 0,
      [LogLevel.Error]: 0,
      [LogLevel.Debug]: 0,
    },
  );
}
