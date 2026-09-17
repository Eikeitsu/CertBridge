import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  setAccentId,
  setCompact,
  setFontScale,
  setThemeMode,
  setThemePack,
} from "@/features/theme/model/themeSlice";
import { selectThemeState } from "@/features/theme/model/selectors";
import { ThemeMode, ThemePack } from "@/entities/module/enums";

export function useAppearanceSettings() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectThemeState);

  return {
    theme,
    setThemeMode: (mode: ThemeMode) => dispatch(setThemeMode(mode)),
    setThemePack: (pack: ThemePack) => dispatch(setThemePack(pack)),
    setCompact: (value: boolean) => dispatch(setCompact(value)),
    setFontScale: (value: number) => dispatch(setFontScale(value)),
    setAccentId: (id: string) => dispatch(setAccentId(id)),
  };
}
