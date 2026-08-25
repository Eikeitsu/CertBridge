import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { ACCENTS, PACK_CHROME_PRESETS, THEME_DEFAULTS } from "@/shared/config/theme";
import { FLAG_OFF, FLAG_ON, FONT_SCALE } from "@/shared/config/constants";
import { ThemeMode, ThemePack, type ResolvedTheme } from "@/entities/module/enums";
import { parseEnum } from "@/shared/lib/enum";
import { applyThemeToDom, migratePack, resolveThemeMode } from "../lib/applyTheme";
import { syncChromeBars } from "../lib/chrome";

export type ThemeState = {
  mode: ThemeMode;
  pack: ThemePack;
  compact: boolean;
  fontScale: number;
  accentId: string;
  resolved: ResolvedTheme;
  hydrated: boolean;
};

function readBool(key: string, fallback: boolean) {
  const stored = localStorage.getItem(key);
  if (stored == null) return fallback;
  return stored === FLAG_ON;
}

function persistFlag(key: string, enabled: boolean) {
  localStorage.setItem(key, enabled ? FLAG_ON : FLAG_OFF);
}

function initialFromStorage(): ThemeState {
  const mode = parseEnum(
    ThemeMode,
    localStorage.getItem(STORAGE_KEYS.themeMode),
    THEME_DEFAULTS.mode,
  );
  const pack = migratePack(localStorage.getItem(STORAGE_KEYS.themePack));
  const accentId = localStorage.getItem(STORAGE_KEYS.accent) || THEME_DEFAULTS.accentId;
  const fontScale =
    Number(localStorage.getItem(STORAGE_KEYS.fontScale) || THEME_DEFAULTS.fontScale) ||
    THEME_DEFAULTS.fontScale;
  return {
    mode,
    pack,
    compact: readBool(STORAGE_KEYS.compact, THEME_DEFAULTS.compact),
    fontScale: Math.min(FONT_SCALE.MAX, Math.max(FONT_SCALE.MIN, fontScale)),
    accentId: ACCENTS.some((accent) => accent.id === accentId)
      ? accentId
      : THEME_DEFAULTS.accentId,
    resolved: resolveThemeMode(mode),
    hydrated: false,
  };
}

const initialState = initialFromStorage();

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    hydrateTheme(state) {
      state.resolved = resolveThemeMode(state.mode);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, false);
      state.hydrated = true;
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      localStorage.setItem(STORAGE_KEYS.themeMode, action.payload);
      state.resolved = resolveThemeMode(action.payload);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, false);
    },
    setThemePack(state, action: PayloadAction<ThemePack>) {
      state.pack = action.payload;
      localStorage.setItem(STORAGE_KEYS.themePack, action.payload);
      const preset = PACK_CHROME_PRESETS[action.payload];
      state.accentId = preset.accentId;
      localStorage.setItem(STORAGE_KEYS.accent, preset.accentId);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, false);
    },
    setCompact(state, action: PayloadAction<boolean>) {
      state.compact = action.payload;
      persistFlag(STORAGE_KEYS.compact, action.payload);
      applyThemeToDom(state);
    },
    setFontScale(state, action: PayloadAction<number>) {
      state.fontScale = Math.min(
        FONT_SCALE.MAX,
        Math.max(FONT_SCALE.MIN, action.payload),
      );
      localStorage.setItem(STORAGE_KEYS.fontScale, String(state.fontScale));
      applyThemeToDom(state);
    },
    setAccentId(state, action: PayloadAction<string>) {
      state.accentId = action.payload;
      localStorage.setItem(STORAGE_KEYS.accent, action.payload);
      applyThemeToDom(state);
    },
    refreshSystemTheme(state) {
      if (state.mode !== ThemeMode.System) return;
      state.resolved = resolveThemeMode(ThemeMode.System);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, false);
    },
  },
});

export const {
  hydrateTheme,
  setThemeMode,
  setThemePack,
  setCompact,
  setFontScale,
  setAccentId,
  refreshSystemTheme,
} = themeSlice.actions;

export default themeSlice.reducer;
