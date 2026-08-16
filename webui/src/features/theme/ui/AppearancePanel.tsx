import { List, Segmented, Slider, Switch } from "antd-mobile";
import { FONT_SCALE } from "@/shared/config/constants";
import { THEME_MODE_OPTIONS } from "@/shared/config/theme";
import { useAppearanceSettings } from "@/features/theme/hooks/useAppearanceSettings";
import type { ThemeMode } from "@/entities/module/enums";
import { ListGroup } from "@/shared/ui/ListGroup";
import { PrefRow } from "@/shared/ui/PrefRow";
import { ThemePackPicker } from "./ThemePackPicker";
import { AccentPicker } from "./AccentPicker";

export function AppearancePanel() {
  const {
    theme,
    isMonetAvailable,
    isMonetPaletteReady,
    fontScalePercent,
    packOptions,
    handleThemePackChange,
    handleThemeModeChange,
    handleUiCustomChange,
    handleAccentChange,
    handleMonetChange,
    handleFloatDockChange,
    handleDockGlassChange,
    handleBarBlurChange,
    handleCompactChange,
    handleFontScaleChange,
  } = useAppearanceSettings();

  return (
    <ListGroup title="外观" meta="切换主题包会同步底栏形态与强调色（未开高级选项时）">
      <List.Item>
        <ThemePackPicker
          value={theme.pack}
          options={[...packOptions]}
          onChange={handleThemePackChange}
        />
      </List.Item>
      <List.Item>
        <p className="cb-field-label">深浅色</p>
        <Segmented
          block
          value={theme.mode}
          onChange={(value) => handleThemeModeChange(String(value) as ThemeMode)}
          options={THEME_MODE_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />
      </List.Item>
      <PrefRow label="高级选项" description="强调色、底栏与字号">
        <Switch checked={theme.uiCustom} onChange={(checked) => handleUiCustomChange(checked)} />
      </PrefRow>
      {theme.uiCustom ? (
        <>
          <List.Item>
            <AccentPicker value={theme.accentId} onChange={handleAccentChange} />
          </List.Item>
          {isMonetAvailable ? (
            <PrefRow
              label="系统取色"
              description={
                isMonetPaletteReady
                  ? "跟随管理器提供的壁纸取色"
                  : "当前管理器未提供取色，仍用强调色"
              }
            >
              <Switch checked={theme.monet} onChange={(checked) => handleMonetChange(checked)} />
            </PrefRow>
          ) : null}
          <PrefRow label="悬浮底栏">
            <Switch
              checked={theme.floatDock}
              onChange={(checked) => handleFloatDockChange(checked)}
            />
          </PrefRow>
          <PrefRow label="底栏毛玻璃">
            <Switch
              checked={theme.dockGlass}
              onChange={(checked) => handleDockGlassChange(checked)}
            />
          </PrefRow>
          <PrefRow label="顶/底栏模糊">
            <Switch checked={theme.barBlur} onChange={(checked) => handleBarBlurChange(checked)} />
          </PrefRow>
          <PrefRow label="紧凑布局">
            <Switch checked={theme.compact} onChange={(checked) => handleCompactChange(checked)} />
          </PrefRow>
          <List.Item>
            <p className="cb-field-label">字号 {fontScalePercent}%</p>
            <Slider
              min={FONT_SCALE.MIN}
              max={FONT_SCALE.MAX}
              step={FONT_SCALE.STEP}
              value={theme.fontScale}
              onChange={(value) => handleFontScaleChange(Number(value))}
            />
          </List.Item>
        </>
      ) : null}
    </ListGroup>
  );
}
