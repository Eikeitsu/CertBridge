import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  setAccentId,
  setFontScale,
  setThemeMode,
  setThemePack,
} from "@/features/theme/model/themeSlice";
import { selectThemeState } from "@/features/theme/model/selectors";
import { ThemePackPickerRow } from "./ThemePackPickerRow";
import { ThemeModePickerRow } from "./ThemeModePickerRow";
import { AccentPickerRow } from "./AccentPickerRow";
import { FontScaleRow } from "./FontScaleRow";
import { Card } from "@/shared/ui/primitives";

export function AppearancePanel() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectThemeState);

  return (
    <Card title="外观" meta="三套独立主题：设置 / 控制台 / 工作室">
      <ThemePackPickerRow
        value={theme.pack}
        onChange={(value) => dispatch(setThemePack(value))}
      />
      <ThemeModePickerRow
        value={theme.mode}
        onChange={(value) => dispatch(setThemeMode(value))}
      />
      <AccentPickerRow
        value={theme.accentId}
        onChange={(value) => dispatch(setAccentId(value))}
      />
      <FontScaleRow
        value={theme.fontScale}
        onChange={(value) => dispatch(setFontScale(value))}
      />
    </Card>
  );
}
