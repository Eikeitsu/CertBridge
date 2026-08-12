import type { CSSProperties } from "react";
import { Segmented, Slider, Switch } from "antd";
import { ACCENTS } from "@/shared/config/paths";
import { FONT_SCALE } from "@/shared/config/constants";
import { useAppearanceSettings } from "@/features/theme/hooks/useAppearanceSettings";
import type { ThemeMode, ThemePack } from "@/entities/module/types";

export function AppearancePanel() {
  const {
    theme,
    selectedPackHint,
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
    <section className="cb-card">
      <div className="cb-section-title">外观</div>
      <div className="cb-stack">
        <div className="cb-field-label">主题包</div>
        <Segmented
          block
          value={theme.pack}
          onChange={(value) => handleThemePackChange(value as ThemePack)}
          options={packOptions.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />
        {selectedPackHint && <p className="cb-pack-hint">{selectedPackHint}</p>}
      </div>

      <div className="cb-stack">
        <div className="cb-field-label">深浅色</div>
        <Segmented
          block
          value={theme.mode}
          onChange={(value) => handleThemeModeChange(value as ThemeMode)}
          options={[
            { label: "跟随系统", value: "system" },
            { label: "浅色", value: "light" },
            { label: "深色", value: "dark" },
          ]}
        />
      </div>

      <div className="cb-pref-row">
        <span>自定义外观</span>
        <Switch checked={theme.uiCustom} onChange={handleUiCustomChange} />
      </div>

      {theme.uiCustom && (
        <>
          <div className="cb-stack">
            <div className="cb-field-label">强调色</div>
            <div className="accent-row">
              {ACCENTS.map((accent) => (
                <button
                  key={accent.id}
                  type="button"
                  title={accent.label}
                  className={`accent-dot${theme.accentId === accent.id ? " active" : ""}`}
                  style={
                    {
                      "--accent-swatch": accent.color,
                    } as CSSProperties
                  }
                  onClick={() => handleAccentChange(accent.id)}
                />
              ))}
            </div>
          </div>

          {isMonetAvailable && (
            <div className="cb-pref-row">
              <span>系统取色</span>
              <Switch checked={theme.monet} onChange={handleMonetChange} />
            </div>
          )}

          <div className="cb-pref-row">
            <span>悬浮底栏</span>
            <Switch checked={theme.floatDock} onChange={handleFloatDockChange} />
          </div>
          <div className="cb-pref-row">
            <span>底栏毛玻璃</span>
            <Switch checked={theme.dockGlass} onChange={handleDockGlassChange} />
          </div>
          <div className="cb-pref-row">
            <span>顶/底栏模糊</span>
            <Switch checked={theme.barBlur} onChange={handleBarBlurChange} />
          </div>
          <div className="cb-pref-row">
            <span>紧凑布局</span>
            <Switch checked={theme.compact} onChange={handleCompactChange} />
          </div>
          <div>
            <div className="cb-field-label">字号 {fontScalePercent}%</div>
            <Slider
              min={FONT_SCALE.MIN}
              max={FONT_SCALE.MAX}
              step={FONT_SCALE.STEP}
              value={theme.fontScale}
              onChange={(value) => handleFontScaleChange(Number(value))}
              tooltip={{
                formatter: (value) => `${Math.round(Number(value) * 100)}%`,
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}
