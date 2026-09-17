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
    hint: "大状态区，证书与环境按组排列",
  },
  {
    id: ThemePack.Ops,
    label: "精简",
    hint: "紧凑面板，状态与列表更集中",
  },
  {
    id: ThemePack.Console,
    label: "终端",
    hint: "等宽字体，路径顶栏与贴边表格",
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
  [ThemePack.Ops]: { compact: true },
  [ThemePack.Console]: { compact: true },
};
