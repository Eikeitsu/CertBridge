import { ACCENTS, MONET_TOKEN_KEYS, supportsMonet } from "@/shared/config/theme";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { ResolvedTheme, ThemeMode } from "@/entities/module/enums";
import type { ThemeState } from "../model/themeSlice";

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === ThemeMode.Light) return ResolvedTheme.Light;
  if (mode === ThemeMode.Dark) return ResolvedTheme.Dark;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? ResolvedTheme.Dark
    : ResolvedTheme.Light;
}

function monetSeed(): string | null {
  const styles = getComputedStyle(document.documentElement);
  for (const tokenKey of MONET_TOKEN_KEYS) {
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
  if (state.monet && supportsMonet(state.pack)) {
    primary = monetSeed() || accentColor;
  }
  root.style.setProperty("--cb-primary", primary);
  root.style.setProperty("--cb-accent", primary);
}
