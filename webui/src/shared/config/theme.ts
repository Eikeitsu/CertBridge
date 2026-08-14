import { ThemeMode, ThemePack } from "@/entities/module/enums";

export const THEME_DEFAULTS = {
  mode: ThemeMode.System,
  pack: ThemePack.Classic,
  accentId: "seal",
  fontScale: 1,
  compact: false,
  floatDock: false,
  dockGlass: true,
  barBlur: true,
  monet: true,
  uiCustom: false,
} as const;

/**
 * 证书桥专属色相：印章青绿 / 钢蓝 / 铜印 / 墨灰。
 * `pair` 是配套的第二色（--cb-accent），虹桥的渐变、印记的骑缝印都靠它拉出双色。
 */
export const ACCENTS = [
  { id: "seal", label: "印章青", color: "#0F5C5C", pair: "#8B6914" },
  { id: "steel", label: "钢蓝", color: "#2F5D8C", pair: "#B07C2B" },
  { id: "bronze", label: "铜印", color: "#8B6914", pair: "#14514F" },
  { id: "ink", label: "墨灰", color: "#3D4F5F", pair: "#9C3B34" },
] as const;

export const PACK_OPTIONS = [
  {
    value: ThemePack.Classic,
    label: "印记",
    hint: "凭证文书",
  },
  {
    value: ThemePack.Material,
    label: "层积",
    hint: "信任分层",
  },
  {
    value: ThemePack.Fluid,
    label: "虹桥",
    hint: "桥接通道",
  },
] as const;

export const THEME_MODE_OPTIONS = [
  { value: ThemeMode.System, label: "跟随系统" },
  { value: ThemeMode.Light, label: "浅色" },
  { value: ThemeMode.Dark, label: "深色" },
] as const;

export const MONET_PACKS: ThemePack[] = [ThemePack.Fluid, ThemePack.Material];

/**
 * WebUI-X（KernelSU / MMRL）通过 internal/colors.css 注入宿主取色，
 * 同时提供 md-sys 与 camelCase 两条通道，两条都要探。
 */
export const MONET_TOKEN_KEYS = ["--md-sys-color-primary", "--primary"] as const;

export function supportsMonet(pack: ThemePack): boolean {
  return MONET_PACKS.includes(pack);
}
