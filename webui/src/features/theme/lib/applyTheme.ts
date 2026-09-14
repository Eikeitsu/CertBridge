import { ACCENTS } from "@/shared/config/theme";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { ResolvedTheme, ThemeMode, ThemePack } from "@/entities/module/enums";
import type { ThemeState } from "../model/themeSlice";

/** 旧主题包一律收敛为单一 Trust Signal 体系 */
export function migratePack(_stored: string | null): ThemePack {
  return ThemePack.Settings;
}

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === ThemeMode.Light) return ResolvedTheme.Light;
  if (mode === ThemeMode.Dark) return ResolvedTheme.Dark;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? ResolvedTheme.Dark
    : ResolvedTheme.Light;
}

export function applyThemeToDom(
  state: Pick<ThemeState, "resolved" | "pack" | "compact" | "fontScale" | "accentId">,
) {
  const root = document.documentElement;
  root.dataset.theme = state.resolved;
  root.dataset.pack = "trust";
  root.dataset.compact = state.compact ? FLAG_ON : FLAG_OFF;
  root.style.setProperty("--cb-font-scale", String(state.fontScale));

  const accent = ACCENTS.find((item) => item.id === state.accentId) || ACCENTS[0];
  root.style.setProperty("--cb-accent-pick", accent.color);
  root.style.setProperty("--cb-accent-pair", accent.pair);
  localStorage.setItem(STORAGE_KEYS.accentColor, accent.color);
  localStorage.setItem(STORAGE_KEYS.accentPair, accent.pair);
}
