import { LogLevel } from "@/entities/module/enums";

export type ChipOption = {
  id: string;
  label: string;
};

/** id 为空表示不过滤（全部） */
export const LOG_LEVEL_PRESETS: ChipOption[] = [
  { id: "", label: "全部" },
  { id: LogLevel.Info, label: "Info" },
  { id: LogLevel.Warn, label: "Warn" },
  { id: LogLevel.Error, label: "Error" },
  { id: LogLevel.Debug, label: "Debug" },
];
