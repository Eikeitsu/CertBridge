import { ACCENTS } from "@/shared/config/paths";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import type { ThemeMode, ThemePack } from "@/entities/module/types";
import type { ThemeState } from "../model/themeSlice";

export function resolveThemeMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function monetSeed(): string | null {
  const styles = getComputedStyle(document.documentElement);
  const tokenKeys = [
    "--wallpaper-main",
    "--monet-primary",
    "--qi-color-primary",
    "--theme-color",
  ];
  for (const tokenKey of tokenKeys) {
    const tokenValue = styles.getPropertyValue(tokenKey).trim();
    if (tokenValue) return tokenValue;
  }
  return null;
}

export function applyThemeToDom(
  state: Pick<
    ThemeState,
    | "resolved"
    | "pack"
    | "compact"
    | "fontScale"
    | "floatDock"
    | "dockGlass"
    | "barBlur"
    | "monet"
    | "accentId"
  >,
) {
  const root = document.documentElement;
  root.dataset.theme = state.resolved;
  root.dataset.pack = state.pack;
  root.dataset.compact = state.compact ? FLAG_ON : FLAG_OFF;
  root.dataset.floatDock = state.floatDock ? FLAG_ON : FLAG_OFF;
  root.dataset.dockGlass = state.dockGlass ? FLAG_ON : FLAG_OFF;
  root.dataset.barBlur = state.barBlur ? FLAG_ON : FLAG_OFF;
  root.style.setProperty("--cb-font-scale", String(state.fontScale));

  const accentColor: string =
    ACCENTS.find((accent) => accent.id === state.accentId)?.color || ACCENTS[0].color;
  let primary: string = accentColor;
  if (state.monet && (state.pack === "fluid" || state.pack === "material")) {
    primary = monetSeed() || accentColor;
  }
  root.style.setProperty("--cb-primary", primary);
  root.style.setProperty("--cb-accent", primary);
}

export const PACK_OPTIONS: { value: ThemePack; label: string; hint: string }[] = [
  { value: "classic", label: "经典印记", hint: "青绿信任印、圆角卡片" },
  { value: "material", label: "Material", hint: "大标题、强调色块" },
  { value: "fluid", label: "流体", hint: "更强毛玻璃与悬浮感" },
];
