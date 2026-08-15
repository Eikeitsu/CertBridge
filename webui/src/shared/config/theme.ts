import { ThemeMode, ThemePack } from "@/entities/module/enums";

export const THEME_DEFAULTS = {
  mode: ThemeMode.System,
  pack: ThemePack.Classic,
  accentId: "wechat",
  fontScale: 1,
  compact: false,
  floatDock: false,
  dockGlass: true,
  barBlur: true,
  monet: true,
  uiCustom: false,
} as const;

/** 新视觉基线强调色（非旧印章青绿） */
export const ACCENTS = [
  { id: "wechat", label: "微信绿", color: "#07C160", pair: "#576B95" },
  { id: "alipay", label: "支付蓝", color: "#1677FF", pair: "#13C2C2" },
  { id: "rose", label: "珊瑚红", color: "#E11D48", pair: "#4F46E5" },
  { id: "ink", label: "墨黑", color: "#111827", pair: "#F59E0B" },
] as const;

export const PACK_OPTIONS = [
  {
    value: ThemePack.Classic,
    label: "印记",
    hint: "微信会话列表",
  },
  {
    value: ThemePack.Material,
    label: "层积",
    hint: "支付宝色块",
  },
  {
    value: ThemePack.Fluid,
    label: "虹桥",
    hint: "沉浸软质",
  },
] as const;

export const THEME_MODE_OPTIONS = [
  { value: ThemeMode.System, label: "跟随系统" },
  { value: ThemeMode.Light, label: "浅色" },
  { value: ThemeMode.Dark, label: "深色" },
] as const;

export const MONET_PACKS: ThemePack[] = [ThemePack.Fluid, ThemePack.Material];

export const MONET_TOKEN_KEYS = ["--md-sys-color-primary", "--primary"] as const;

export function supportsMonet(pack: ThemePack): boolean {
  return MONET_PACKS.includes(pack);
}
