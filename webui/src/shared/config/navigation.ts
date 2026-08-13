import { TabName } from "@/entities/module/enums";
import { isEnumValue } from "@/shared/lib/enum";

export const TABS: { key: TabName; label: string }[] = [
  { key: TabName.Home, label: "概览" },
  { key: TabName.Certs, label: "证书" },
  { key: TabName.Log, label: "日志" },
  { key: TabName.More, label: "更多" },
];

export function isTabName(name: unknown): name is TabName {
  return isEnumValue(TabName, name);
}

export const TAB_PATH: Record<TabName, string> = {
  [TabName.Home]: "/",
  [TabName.Certs]: "/certs",
  [TabName.Log]: "/log",
  [TabName.More]: "/more",
};
