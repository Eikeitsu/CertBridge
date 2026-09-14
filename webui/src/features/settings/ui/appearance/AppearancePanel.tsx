import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { setAccentId, setFontScale, setThemeMode } from "@/features/theme/model/themeSlice";
import { selectThemeState } from "@/features/theme/model/selectors";
import { ThemeModePickerRow } from "./ThemeModePickerRow";
import { AccentPickerRow } from "./AccentPickerRow";
import { FontScaleRow } from "./FontScaleRow";
import { Card } from "@/shared/ui/primitives";

type AppearancePanelProps = {
  title?: string;
  meta?: string;
};

export function AppearancePanel({
  title = "外观",
  meta = "浅色 / 深色与强调色",
}: AppearancePanelProps) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectThemeState);

  return (
    <Card title={title} meta={meta}>
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
