import { ThemeMode, ThemePack } from "@/entities/module/enums";

export const THEME_DEFAULTS = {
  mode: ThemeMode.System,
  pack: ThemePack.Settings,
  accentId: "teal",
  fontScale: 1,
  compact: false,
} as const;

export const ACCENTS = [
  { id: "teal", label: "青绿", color: "#0D9488", pair: "#0F766E" },
  { id: "steel", label: "钢蓝", color: "#1D4ED8", pair: "#334155" },
  { id: "stone", label: "暖石", color: "#B45309", pair: "#78716C" },
  { id: "ink", label: "墨黑", color: "#1E293B", pair: "#0D9488" },
] as const;

export const THEME_MODE_OPTIONS = [
  { value: ThemeMode.System, label: "跟随系统" },
  { value: ThemeMode.Light, label: "浅色" },
  { value: ThemeMode.Dark, label: "深色" },
] as const;
