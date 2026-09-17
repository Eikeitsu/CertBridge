import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { STORAGE_KEYS } from "@/shared/config/paths";
import { ACCENTS, PACK_CHROME_DEFAULTS, THEME_DEFAULTS } from "@/shared/config/theme";
import { FLAG_OFF, FLAG_ON, FONT_SCALE } from "@/shared/config/constants";
import { ThemeMode, ThemePack, type ResolvedTheme } from "@/entities/module/enums";
import { parseEnum } from "@/shared/lib/enum";
import { readStorage, writeStorage } from "@/shared/lib/storage";
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
  const stored = readStorage(key);
  if (stored == null) return fallback;
  return stored === FLAG_ON;
}

function persistFlag(key: string, enabled: boolean) {
  writeStorage(key, enabled ? FLAG_ON : FLAG_OFF);
}

function initialFromStorage(): ThemeState {
  const mode = parseEnum(
    ThemeMode,
    readStorage(STORAGE_KEYS.themeMode),
    THEME_DEFAULTS.mode,
  );
  const pack = migratePack(readStorage(STORAGE_KEYS.themePack));
  const rawAccent = readStorage(STORAGE_KEYS.accent) || THEME_DEFAULTS.accentId;
  const accentId = rawAccent === "stone" ? "amber" : rawAccent;
  const fontScale =
    Number(readStorage(STORAGE_KEYS.fontScale) || THEME_DEFAULTS.fontScale) ||
    THEME_DEFAULTS.fontScale;
  return {
    mode,
    pack,
    compact: readBool(STORAGE_KEYS.compact, PACK_CHROME_DEFAULTS[pack].compact),
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
      writeStorage(STORAGE_KEYS.themeMode, action.payload);
      state.resolved = resolveThemeMode(action.payload);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, false);
    },
    setThemePack(state, action: PayloadAction<ThemePack>) {
      state.pack = action.payload;
      writeStorage(STORAGE_KEYS.themePack, action.payload);
      const chrome = PACK_CHROME_DEFAULTS[action.payload];
      state.compact = chrome.compact;
      persistFlag(STORAGE_KEYS.compact, chrome.compact);
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
      writeStorage(STORAGE_KEYS.fontScale, String(state.fontScale));
      applyThemeToDom(state);
    },
    setAccentId(state, action: PayloadAction<string>) {
      state.accentId = action.payload;
      writeStorage(STORAGE_KEYS.accent, action.payload);
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
