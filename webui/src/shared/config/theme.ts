import { ThemeMode, ThemePack } from "@/entities/module/enums";

export const THEME_DEFAULTS = {
  mode: ThemeMode.System,
  pack: ThemePack.Settings,
  accentId: "teal",
  fontScale: 1,
  compact: false,
} as const;

export const ACCENTS = [
  { id: "teal", label: "青绿", color: "#0F766E", pair: "#0E7490" },
  { id: "steel", label: "钢蓝", color: "#1D4ED8", pair: "#334155" },
  { id: "stone", label: "暖石", color: "#B45309", pair: "#78716C" },
  { id: "ink", label: "墨黑", color: "#1E293B", pair: "#0F766E" },
] as const;

export const PACK_OPTIONS = [
  {
    value: ThemePack.Settings,
    label: "设置",
    hint: "分组列表 · 管理口语 · 扁平底栏",
  },
  {
    value: ThemePack.Console,
    label: "控制台",
    hint: "指标优先 · 技术短词 · 终端日志",
  },
  {
    value: ThemePack.Studio,
    label: "工作室",
    hint: "状态画布 · 产品叙事 · 悬浮底栏",
  },
] as const;

export const PACK_CHROME_PRESETS: Record<ThemePack, { accentId: string }> = {
  [ThemePack.Settings]: { accentId: "teal" },
  [ThemePack.Console]: { accentId: "steel" },
  [ThemePack.Studio]: { accentId: "stone" },
};

export const THEME_MODE_OPTIONS = [
  { value: ThemeMode.System, label: "跟随系统" },
  { value: ThemeMode.Light, label: "浅色" },
  { value: ThemeMode.Dark, label: "深色" },
] as const;

export function supportsMonet(_pack: ThemePack): boolean {
  return false;
}
