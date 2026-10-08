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
  get STATE() {
    return `${MODDIR}/data/state`;
  },
  /** 后台完整 status 落盘（避免堵死 WebUI 桥） */
  get STATUS_FULL_OUT() {
    return `${MODDIR}/data/state/status-full.out`;
  },
  /** 最近一次安装/升级过程 */
  get INSTALL_LOG() {
    return `${MODDIR}/data/install.log`;
  },
  /** 当前开机注入/运行（跨 reboot 会清空） */
  get RUNTIME_LOG() {
    return `${MODDIR}/data/runtime.log`;
  },
  /** @deprecated 兼容旧引用 → 运行日志 */
  get LOG() {
    return `${MODDIR}/data/runtime.log`;
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
  /** 首帧引导脚本直接读这两个色值，避免在 HTML 里重复维护色板 */
  accentColor: "cb_accent_color",
  accentPair: "cb_accent_pair",
  uiCustom: "cb_ui_custom",
  hotSdPath: "cb_hot_sd_path",
  logLevelFilter: "cb_log_level_filter",
  logWrap: "cb_log_wrap",
  captureChecklistDismissed: "cb_capture_checklist_dismissed",
  updateChannel: "cb_update_channel",
  /** 底栏是否显示「隐藏」页 */
  showHideTab: "cb_show_hide_tab",
  uiLang: "cb_ui_lang",
} as const;

export { LINKS } from "./brand";
export { ACCENTS } from "./theme";
