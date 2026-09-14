import type { RootState } from "@/app/store";

export const selectThemeState = (state: RootState) => state.theme;

export const selectThemePack = (state: RootState) => state.theme.pack;

export const selectResolvedTheme = (state: RootState) => state.theme.resolved;

export const selectBarBlurEnabled = (_state: RootState) => false;

export const selectIsCompact = (state: RootState) => state.theme.compact;

export const selectAccentId = (state: RootState) => state.theme.accentId;

export const selectIsMonetEnabled = (_state: RootState) => false;
