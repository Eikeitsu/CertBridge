import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  setAccentId,
  setFontScale,
  setThemeMode,
  setThemePack,
} from "@/features/theme/model/themeSlice";
import { selectThemeState } from "@/features/theme/model/selectors";
import { THEME_PACKS } from "@/shared/config/theme";
import { ThemeModePickerRow } from "./ThemeModePickerRow";
import { AccentPickerRow } from "./AccentPickerRow";
import { FontScaleRow } from "./FontScaleRow";
import { Card } from "@/shared/ui/primitives";

type AppearancePanelProps = {
  title?: string;
  meta?: string;
  surface?: "card" | "plain";
};

export function AppearancePanel({
  title = "外观",
  meta = "主题包、浅深色与强调色",
  surface = "card",
}: AppearancePanelProps) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectThemeState);

  return (
    <Card title={title} meta={meta} surface={surface} className="bf-appearance">
      <div className="bf-pack-grid">
        {THEME_PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            className={`bf-pack-card${theme.pack === pack.id ? " is-active" : ""}`}
            onClick={() => dispatch(setThemePack(pack.id))}
          >
            <div className="bf-pack-preview" data-pack={pack.id} aria-hidden />
            <span className="bf-pack-card__body">
              <strong>{pack.label}</strong>
              <span className="bf-pack-card__hint">{pack.hint}</span>
            </span>
          </button>
        ))}
      </div>
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
