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

export function useAppearanceSettings() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectThemeState);
  const selectedPackHint = useMemo(
    () => PACK_OPTIONS.find((option) => option.value === theme.pack)?.hint,
    [theme.pack],
  );
  const isMonetAvailable = supportsMonet(theme.pack);
  const fontScalePercent = Math.round(theme.fontScale * 100);

  return {
    theme,
    selectedPackHint,
    isMonetAvailable,
    fontScalePercent,
    packOptions: PACK_OPTIONS,
    handleThemePackChange: (pack: ThemePack) => dispatch(setThemePack(pack)),
    handleThemeModeChange: (mode: ThemeMode) => dispatch(setThemeMode(mode)),
    handleUiCustomChange: (enabled: boolean) => dispatch(setUiCustom(enabled)),
    handleAccentChange: (accentId: string) => dispatch(setAccentId(accentId)),
    handleMonetChange: (enabled: boolean) => dispatch(setMonet(enabled)),
    handleFloatDockChange: (enabled: boolean) => dispatch(setFloatDock(enabled)),
    handleDockGlassChange: (enabled: boolean) => dispatch(setDockGlass(enabled)),
    handleBarBlurChange: (enabled: boolean) => dispatch(setBarBlur(enabled)),
    handleCompactChange: (enabled: boolean) => dispatch(setCompact(enabled)),
    handleFontScaleChange: (scale: number) => dispatch(setFontScale(scale)),
  };
}
