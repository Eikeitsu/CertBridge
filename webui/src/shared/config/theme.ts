import { ThemeMode, ThemePack } from "@/entities/module/enums";

export const THEME_DEFAULTS = {
  mode: ThemeMode.System,
  pack: ThemePack.Default,
  accentId: "teal",
  fontScale: 1,
  compact: false,
} as const;

export const THEME_PACKS = [
  {
    id: ThemePack.Default,
    label: "默认",
    hint: "干净清晰，适合日常查看与开关证书",
  },
  {
    id: ThemePack.Console,
    label: "控制台",
    hint: "紧凑终端风，适合盯日志与运维状态",
  },
] as const;

export const ACCENTS = [
  { id: "teal", label: "青绿", color: "#0F766E", pair: "#115E59" },
  { id: "steel", label: "钢蓝", color: "#2563EB", pair: "#1E3A8A" },
  { id: "amber", label: "琥珀", color: "#D97706", pair: "#92400E" },
  { id: "ink", label: "墨青", color: "#0F172A", pair: "#0F766E" },
] as const;

export const THEME_MODE_OPTIONS = [
  { value: ThemeMode.System, label: "跟随系统" },
  { value: ThemeMode.Light, label: "浅色" },
  { value: ThemeMode.Dark, label: "深色" },
] as const;

/** 切换主题包时的壳层默认 */
export const PACK_CHROME_DEFAULTS: Record<
  ThemePack,
  { compact: boolean }
> = {
  [ThemePack.Default]: { compact: false },
  [ThemePack.Console]: { compact: true },
};
