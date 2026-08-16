import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectThemeState } from "@/features/theme/model/selectors";
import {
  setAccentId,
  setBarBlur,
  setCompact,
  setDockGlass,
  setFloatDock,
  setFontScale,
  setMonet,
  setThemeMode,
  setThemePack,
  setUiCustom,
} from "@/features/theme/model/themeSlice";
import { PACK_OPTIONS, supportsMonet } from "@/shared/config/theme";
import type { ThemeMode, ThemePack } from "@/entities/module/enums";
import { useMonetPalette } from "./useMonetPalette";

export function useAppearanceSettings() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectThemeState);
  const selectedPackHint = useMemo(
    () => PACK_OPTIONS.find((option) => option.value === theme.pack)?.hint,
    [theme.pack],
  );
  const isMonetAvailable = supportsMonet(theme.pack);
  const isMonetPaletteReady = useMonetPalette();
  const fontScalePercent = Math.round(theme.fontScale * 100);

  return {
    theme,
    selectedPackHint,
    isMonetAvailable,
    isMonetPaletteReady,
    fontScalePercent,
    packOptions: PACK_OPTIONS,
    handleThemePackChange: (pack: ThemePack) => {
      void dispatch(setThemePack(pack));
    },
    handleThemeModeChange: (mode: ThemeMode) => {
      void dispatch(setThemeMode(mode));
    },
    handleUiCustomChange: (enabled: boolean) => {
      void dispatch(setUiCustom(enabled));
    },
    handleAccentChange: (accentId: string) => {
      void dispatch(setAccentId(accentId));
    },
    handleMonetChange: (enabled: boolean) => {
      void dispatch(setMonet(enabled));
    },
    handleFloatDockChange: (enabled: boolean) => {
      void dispatch(setFloatDock(enabled));
    },
    handleDockGlassChange: (enabled: boolean) => {
      void dispatch(setDockGlass(enabled));
    },
    handleBarBlurChange: (enabled: boolean) => {
      void dispatch(setBarBlur(enabled));
    },
    handleCompactChange: (enabled: boolean) => {
      void dispatch(setCompact(enabled));
    },
    handleFontScaleChange: (scale: number) => {
      void dispatch(setFontScale(scale));
    },
  };
}
