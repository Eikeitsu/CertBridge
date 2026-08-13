import { ThemeMode, ThemePack } from "@/entities/module/enums";

export const THEME_DEFAULTS = {
  mode: ThemeMode.System,
  pack: ThemePack.Classic,
  accentId: "teal",
  fontScale: 1,
  compact: false,
  floatDock: false,
  dockGlass: true,
  barBlur: true,
  monet: true,
  uiCustom: false,
} as const;

export const ACCENTS = [
  { id: "teal", label: "青绿", color: "#0F766E" },
  { id: "cyan", label: "青蓝", color: "#0891B2" },
  { id: "emerald", label: "翠绿", color: "#059669" },
  { id: "slate", label: "墨灰", color: "#475569" },
] as const;

export const PACK_OPTIONS = [
  { value: ThemePack.Classic, label: "经典印记", hint: "冷纸面 · TRUST 印记" },
  { value: ThemePack.Material, label: "Material", hint: "大标题 · 分层色块" },
  { value: ThemePack.Fluid, label: "流体", hint: "玻璃拟态 · 悬浮层次" },
] as const;

export const THEME_MODE_OPTIONS = [
  { value: ThemeMode.System, label: "跟随系统" },
  { value: ThemeMode.Light, label: "浅色" },
  { value: ThemeMode.Dark, label: "深色" },
] as const;

export const MONET_PACKS: ThemePack[] = [ThemePack.Fluid, ThemePack.Material];

export const MONET_TOKEN_KEYS = [
  "--wallpaper-main",
  "--monet-primary",
  "--qi-color-primary",
  "--theme-color",
] as const;

export function supportsMonet(pack: ThemePack): boolean {
  return MONET_PACKS.includes(pack);
}
