import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { ACCENTS, STORAGE_KEYS } from "@/shared/config/paths";
import { FLAG_OFF, FLAG_ON, FONT_SCALE } from "@/shared/config/constants";
import type { ResolvedTheme, ThemeMode, ThemePack } from "@/entities/module/types";
import { applyThemeToDom, resolveThemeMode } from "../lib/applyTheme";
import { syncChromeBars } from "../lib/chrome";

export type ThemeState = {
  mode: ThemeMode;
  pack: ThemePack;
  compact: boolean;
  fontScale: number;
  floatDock: boolean;
  dockGlass: boolean;
  barBlur: boolean;
  monet: boolean;
  accentId: string;
  uiCustom: boolean;
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
  const mode = (localStorage.getItem(STORAGE_KEYS.themeMode) as ThemeMode) || "system";
  const pack = (localStorage.getItem(STORAGE_KEYS.themePack) as ThemePack) || "classic";
  const accentId = localStorage.getItem(STORAGE_KEYS.accent) || "teal";
  const fontScale = Number(localStorage.getItem(STORAGE_KEYS.fontScale) || "1") || 1;
  return {
    mode,
    pack: ["classic", "material", "fluid"].includes(pack) ? pack : "classic",
    compact: readBool(STORAGE_KEYS.compact, false),
    fontScale: Math.min(FONT_SCALE.MAX, Math.max(FONT_SCALE.MIN, fontScale)),
    floatDock: readBool(STORAGE_KEYS.floatDock, false),
    dockGlass: readBool(STORAGE_KEYS.dockGlass, true),
    barBlur: readBool(STORAGE_KEYS.barBlur, true),
    monet: readBool(STORAGE_KEYS.monet, true),
    accentId: ACCENTS.some((accent) => accent.id === accentId) ? accentId : "teal",
    uiCustom: readBool(STORAGE_KEYS.uiCustom, false),
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
      syncChromeBars(state.resolved, state.barBlur);
      state.hydrated = true;
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      localStorage.setItem(STORAGE_KEYS.themeMode, action.payload);
      state.resolved = resolveThemeMode(action.payload);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, state.barBlur);
    },
    setThemePack(state, action: PayloadAction<ThemePack>) {
      state.pack = action.payload;
      localStorage.setItem(STORAGE_KEYS.themePack, action.payload);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, state.barBlur);
    },
    setCompact(state, action: PayloadAction<boolean>) {
      state.compact = action.payload;
      persistFlag(STORAGE_KEYS.compact, action.payload);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, state.barBlur);
    },
    setFontScale(state, action: PayloadAction<number>) {
      state.fontScale = Math.min(
        FONT_SCALE.MAX,
        Math.max(FONT_SCALE.MIN, action.payload),
      );
      localStorage.setItem(STORAGE_KEYS.fontScale, String(state.fontScale));
      applyThemeToDom(state);
    },
    setFloatDock(state, action: PayloadAction<boolean>) {
      state.floatDock = action.payload;
      persistFlag(STORAGE_KEYS.floatDock, action.payload);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, state.barBlur);
    },
    setDockGlass(state, action: PayloadAction<boolean>) {
      state.dockGlass = action.payload;
      persistFlag(STORAGE_KEYS.dockGlass, action.payload);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, state.barBlur);
    },
    setBarBlur(state, action: PayloadAction<boolean>) {
      state.barBlur = action.payload;
      persistFlag(STORAGE_KEYS.barBlur, action.payload);
      applyThemeToDom(state);
      syncChromeBars(state.resolved, state.barBlur);
    },
    setMonet(state, action: PayloadAction<boolean>) {
      state.monet = action.payload;
      persistFlag(STORAGE_KEYS.monet, action.payload);
      applyThemeToDom(state);
    },
    setAccentId(state, action: PayloadAction<string>) {
      state.accentId = action.payload;
      localStorage.setItem(STORAGE_KEYS.accent, action.payload);
      applyThemeToDom(state);
    },
    setUiCustom(state, action: PayloadAction<boolean>) {
      state.uiCustom = action.payload;
      persistFlag(STORAGE_KEYS.uiCustom, action.payload);
    },
    refreshSystemTheme(state) {
      if (state.mode !== "system") return;
      state.resolved = resolveThemeMode("system");
      applyThemeToDom(state);
      syncChromeBars(state.resolved, state.barBlur);
    },
  },
});

export const {
  hydrateTheme,
  setThemeMode,
  setThemePack,
  setCompact,
  setFontScale,
  setFloatDock,
  setDockGlass,
  setBarBlur,
  setMonet,
  setAccentId,
  setUiCustom,
  refreshSystemTheme,
} = themeSlice.actions;

export default themeSlice.reducer;
