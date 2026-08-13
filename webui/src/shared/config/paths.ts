/** 仅代码侧路径，绝不在 UI 展示 */
function joinRoot(...parts: string[]) {
  return `/${parts.join("/")}`;
}

const MODDIR = joinRoot("data", "adb", "modules", "CertBridge");

export const PATHS = {
  MODDIR,
  get CLI() {
    return `${MODDIR}/bin/cert_manager.sh`;
  },
  get LOG() {
    return `${MODDIR}/data/install.log`;
  },
} as const;

export const STORAGE_KEYS = {
  themeMode: "cb_theme_mode",
  themePack: "cb_theme_pack",
  compact: "cb_compact",
  fontScale: "cb_font_scale",
  floatDock: "cb_float_dock",
  dockGlass: "cb_dock_glass",
  barBlur: "cb_bar_blur",
  monet: "cb_monet",
  accent: "cb_accent",
  uiCustom: "cb_ui_custom",
  hotSdPath: "cb_hot_sd_path",
} as const;

export { LINKS } from "./brand";
export { ACCENTS } from "./theme";
