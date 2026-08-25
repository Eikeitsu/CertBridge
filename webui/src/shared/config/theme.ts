import { ThemeMode, ThemePack } from "@/entities/module/enums";

export const THEME_DEFAULTS = {
  mode: ThemeMode.System,
  pack: ThemePack.Settings,
  accentId: "teal",
  fontScale: 1,
  compact: false,
} as const;

export const ACCENTS = [
  { id: "teal", label: "青绿", color: "#0D9488", pair: "#0369A1" },
  { id: "blue", label: "天蓝", color: "#2563EB", pair: "#0891B2" },
  { id: "amber", label: "琥珀", color: "#D97706", pair: "#B45309" },
  { id: "rose", label: "玫红", color: "#E11D48", pair: "#7C3AED" },
] as const;

export const PACK_OPTIONS = [
  {
    value: ThemePack.Settings,
    label: "设置",
    hint: "灰底分组列表 · 细线 · 扁平底栏",
  },
  {
    value: ThemePack.Console,
    label: "控制台",
    hint: "高密度指标 · 等宽日志 · 深色友好",
  },
  {
    value: ThemePack.Studio,
    label: "工作室",
    hint: "大状态 Hero · 轻氛围 · 克制产品感",
  },
] as const;

export const PACK_CHROME_PRESETS: Record<
  ThemePack,
  { accentId: string }
> = {
  [ThemePack.Settings]: { accentId: "teal" },
  [ThemePack.Console]: { accentId: "blue" },
  [ThemePack.Studio]: { accentId: "rose" },
};

export const THEME_MODE_OPTIONS = [
  { value: ThemeMode.System, label: "跟随系统" },
  { value: ThemeMode.Light, label: "浅色" },
  { value: ThemeMode.Dark, label: "深色" },
] as const;

export function supportsMonet(_pack: ThemePack): boolean {
  return false;
}
