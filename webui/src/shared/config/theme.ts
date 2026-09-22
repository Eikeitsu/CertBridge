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
    labelKey: "theme.packs.default.label",
    hintKey: "theme.packs.default.hint",
  },
  {
    id: ThemePack.Ops,
    labelKey: "theme.packs.ops.label",
    hintKey: "theme.packs.ops.hint",
  },
  {
    id: ThemePack.Console,
    labelKey: "theme.packs.console.label",
    hintKey: "theme.packs.console.hint",
  },
] as const;

export const ACCENTS = [
  { id: "teal", labelKey: "theme.accents.teal", color: "#0F766E", pair: "#115E59" },
  { id: "steel", labelKey: "theme.accents.steel", color: "#2563EB", pair: "#1E3A8A" },
  { id: "amber", labelKey: "theme.accents.amber", color: "#D97706", pair: "#92400E" },
  { id: "ink", labelKey: "theme.accents.ink", color: "#0F172A", pair: "#0F766E" },
] as const;

export const THEME_MODE_OPTIONS = [
  { value: ThemeMode.System, labelKey: "theme.modes.system" },
  { value: ThemeMode.Light, labelKey: "theme.modes.light" },
  { value: ThemeMode.Dark, labelKey: "theme.modes.dark" },
] as const;

/** 切换主题包时的壳层默认 */
export const PACK_CHROME_DEFAULTS: Record<ThemePack, { compact: boolean }> = {
  [ThemePack.Default]: { compact: false },
  [ThemePack.Ops]: { compact: true },
  [ThemePack.Console]: { compact: true },
};
