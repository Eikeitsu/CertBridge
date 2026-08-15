import { FONT_SCALE } from "@/shared/config/constants";
import { THEME_MODE_OPTIONS } from "@/shared/config/theme";
import { useAppearanceSettings } from "@/features/theme/hooks/useAppearanceSettings";
import type { ThemeMode } from "@/entities/module/enums";
import {
  NxCard,
  NxSection,
  NxSegment,
  NxSlider,
  NxSwitch,
  NxToggleRow,
} from "@/shared/ui";
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
    <NxSection eyebrow="Look" title="外观工作室">
      <NxCard>
        <ThemePackPicker
          value={theme.pack}
          options={[...packOptions]}
          onChange={handleThemePackChange}
        />

        <p className="nx-field__label" style={{ marginTop: 16 }}>
          深浅色
        </p>
        <NxSegment
          value={theme.mode}
          onChange={(value) => handleThemeModeChange(value as ThemeMode)}
          options={THEME_MODE_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />

        <div style={{ marginTop: 8 }}>
          <NxToggleRow label="高级选项" description="强调色、底栏与字号">
            <NxSwitch checked={theme.uiCustom} onChange={handleUiCustomChange} />
          </NxToggleRow>

          {theme.uiCustom ? (
            <>
              <AccentPicker value={theme.accentId} onChange={handleAccentChange} />
              {isMonetAvailable ? (
                <NxToggleRow
                  label="系统取色"
                  description={
                    isMonetPaletteReady
                      ? "跟随管理器提供的壁纸取色"
                      : "当前管理器未提供取色，仍用强调色"
                  }
                >
                  <NxSwitch checked={theme.monet} onChange={handleMonetChange} />
                </NxToggleRow>
              ) : null}
              <NxToggleRow label="悬浮底栏">
                <NxSwitch checked={theme.floatDock} onChange={handleFloatDockChange} />
              </NxToggleRow>
              <NxToggleRow label="底栏毛玻璃">
                <NxSwitch checked={theme.dockGlass} onChange={handleDockGlassChange} />
              </NxToggleRow>
              <NxToggleRow label="顶/底栏模糊">
                <NxSwitch checked={theme.barBlur} onChange={handleBarBlurChange} />
              </NxToggleRow>
              <NxToggleRow label="紧凑布局">
                <NxSwitch checked={theme.compact} onChange={handleCompactChange} />
              </NxToggleRow>
              <NxSlider
                label={`字号 ${fontScalePercent}%`}
                min={FONT_SCALE.MIN}
                max={FONT_SCALE.MAX}
                step={FONT_SCALE.STEP}
                value={theme.fontScale}
                onChange={handleFontScaleChange}
              />
            </>
          ) : null}
        </div>
      </NxCard>
    </NxSection>
  );
}
