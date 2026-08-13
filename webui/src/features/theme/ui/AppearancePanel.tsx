import { List, Slider, Switch } from "antd-mobile";
import { FONT_SCALE } from "@/shared/config/constants";
import { THEME_MODE_OPTIONS } from "@/shared/config/theme";
import { useAppearanceSettings } from "@/features/theme/hooks/useAppearanceSettings";
import type { ThemeMode } from "@/entities/module/enums";
import { FieldLabel, Panel, PrefRow, Segmented, Stack } from "@/shared/ui";
import { ThemePackPicker } from "./ThemePackPicker";
import { AccentPicker } from "./AccentPicker";

export function AppearancePanel() {
  const {
    theme,
    isMonetAvailable,
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
    <Panel title="外观">
      <ThemePackPicker
        value={theme.pack}
        options={[...packOptions]}
        onChange={handleThemePackChange}
      />

      <Stack>
        <FieldLabel>深浅色</FieldLabel>
        <Segmented
          value={theme.mode}
          onChange={(value) => handleThemeModeChange(value as ThemeMode)}
          options={THEME_MODE_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />
      </Stack>

      <List>
        <PrefRow label="高级选项">
          <Switch
            checked={theme.uiCustom}
            onChange={(checked) => {
              handleUiCustomChange(checked);
            }}
          />
        </PrefRow>

        {theme.uiCustom ? (
          <>
            <List.Item>
              <AccentPicker value={theme.accentId} onChange={handleAccentChange} />
            </List.Item>
            {isMonetAvailable ? (
              <PrefRow label="系统取色">
                <Switch
                  checked={theme.monet}
                  onChange={(checked) => {
                    handleMonetChange(checked);
                  }}
                />
              </PrefRow>
            ) : null}
            <PrefRow label="悬浮底栏">
              <Switch
                checked={theme.floatDock}
                onChange={(checked) => {
                  handleFloatDockChange(checked);
                }}
              />
            </PrefRow>
            <PrefRow label="底栏毛玻璃">
              <Switch
                checked={theme.dockGlass}
                onChange={(checked) => {
                  handleDockGlassChange(checked);
                }}
              />
            </PrefRow>
            <PrefRow label="顶/底栏模糊">
              <Switch
                checked={theme.barBlur}
                onChange={(checked) => {
                  handleBarBlurChange(checked);
                }}
              />
            </PrefRow>
            <PrefRow label="紧凑布局">
              <Switch
                checked={theme.compact}
                onChange={(checked) => {
                  handleCompactChange(checked);
                }}
              />
            </PrefRow>
            <List.Item>
              <FieldLabel>字号 {fontScalePercent}%</FieldLabel>
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
      </List>
    </Panel>
  );
}
