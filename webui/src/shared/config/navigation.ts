import type { TabName } from "@/entities/module/types";

export const TABS: { key: TabName; label: string }[] = [
  { key: "home", label: "概览" },
  { key: "certs", label: "证书" },
  { key: "log", label: "日志" },
  { key: "more", label: "更多" },
];

export function isTabName(name: unknown): name is TabName {
  return TABS.some((t) => t.key === name);
}

export const TAB_PATH: Record<TabName, string> = {
  home: "/",
  certs: "/certs",
  log: "/log",
  more: "/more",
};
