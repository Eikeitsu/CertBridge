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

export const DOCS_URL = "https://eikeitsu.github.io/CertBridge/";
export const REPO_URL = "https://github.com/eikeitsu/CertBridge";
export const COOLAPK_URL = "https://www.coolapk.com/u/7602666";
export const REQABLE_URL = "https://reqable.com";
export const PROXYPIN_URL = "https://github.com/wanghongenpin/proxypin";

export const ACCENTS = [
  { id: "teal", label: "青绿", color: "#0F766E" },
  { id: "cyan", label: "青蓝", color: "#0891B2" },
  { id: "emerald", label: "翠绿", color: "#059669" },
  { id: "slate", label: "墨灰", color: "#475569" },
] as const;
