import { ACCENTS } from "@/shared/config/theme";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { FLAG_OFF, FLAG_ON } from "@/shared/config/constants";
import { ResolvedTheme, ThemeMode, ThemePack } from "@/entities/module/enums";
import { writeStorage } from "@/shared/lib/storage";
import type { ThemeState } from "../model/themeSlice";

/** 旧包名迁移到 default | console */
export function migratePack(stored: string | null): ThemePack {
  if (stored === ThemePack.Console || stored === "material") return ThemePack.Console;
  return ThemePack.Default;
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
  root.dataset.pack = state.pack;
  root.dataset.compact = state.compact ? FLAG_ON : FLAG_OFF;
  root.style.setProperty("--bf-font-scale", String(state.fontScale));

  const accent = ACCENTS.find((item) => item.id === state.accentId) || ACCENTS[0];
  root.style.setProperty("--bf-accent-pick", accent.color);
  root.style.setProperty("--bf-accent-pair", accent.pair);
  root.style.setProperty("--bf-primary", accent.color);
  writeStorage(STORAGE_KEYS.accentColor, accent.color);
  writeStorage(STORAGE_KEYS.accentPair, accent.pair);
}
