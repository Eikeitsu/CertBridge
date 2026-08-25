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

type AppearancePanelProps = {
  title?: string;
  meta?: string;
  dense?: boolean;
  heroCards?: boolean;
};

export function AppearancePanel({
  title = "外观",
  meta = "主题包会改变布局与文案语气",
  dense,
  heroCards,
}: AppearancePanelProps) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectThemeState);

  return (
    <Card title={title} meta={meta} className={dense ? "cb-card--dense" : undefined}>
      <ThemePackPickerRow
        value={theme.pack}
        onChange={(value) => dispatch(setThemePack(value))}
        previewCards={heroCards}
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
