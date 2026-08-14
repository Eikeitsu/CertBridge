import { ACCENTS, MONET_TOKEN_KEYS, supportsMonet } from "@/shared/config/theme";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { ResolvedTheme, ThemeMode } from "@/entities/module/enums";
import type { ThemeState } from "../model/themeSlice";

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === ThemeMode.Light) return ResolvedTheme.Light;
  if (mode === ThemeMode.Dark) return ResolvedTheme.Dark;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? ResolvedTheme.Dark
    : ResolvedTheme.Light;
}

/** 宿主是否真的注入了莫奈色板（colors.css 是远程 @import，早期读可能还是空） */
export function hasMonetPalette(): boolean {
  const styles = getComputedStyle(document.documentElement);
  return MONET_TOKEN_KEYS.some(
    (tokenKey) => styles.getPropertyValue(tokenKey).trim() !== "",
  );
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

  const accent = ACCENTS.find((item) => item.id === state.accentId) || ACCENTS[0];
  const isMonetOn = state.monet && supportsMonet(state.pack);

  /* 强调色只作为兜底写入；主色交给 CSS 里的 data-monet 规则决定，
     否则 inline 会压过宿主色板，开关就永远看不出差别 */
  root.dataset.monet = isMonetOn ? FLAG_ON : FLAG_OFF;
  root.style.setProperty("--cb-accent-pick", accent.color);
  root.style.setProperty("--cb-accent-pair", accent.pair);
  localStorage.setItem(STORAGE_KEYS.accentColor, accent.color);
  localStorage.setItem(STORAGE_KEYS.accentPair, accent.pair);
}
