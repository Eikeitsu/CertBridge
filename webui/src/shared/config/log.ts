import { LogLevel } from "@/entities/module/enums";

export type ChipOption = {
  id: string;
  label: string;
};

/** id 为空表示不过滤（全部） */
export const LOG_LEVEL_PRESETS: ChipOption[] = [
  { id: "", label: "全部" },
  { id: LogLevel.Info, label: "信息" },
  { id: LogLevel.Warn, label: "警告" },
  { id: LogLevel.Error, label: "错误" },
  { id: LogLevel.Debug, label: "调试" },
];
