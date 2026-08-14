export const FLAG_ON = "1";
export const FLAG_OFF = "0";
export type FlagValue = typeof FLAG_ON | typeof FLAG_OFF;

export const CLI_TIMEOUT_MS = {
  DEFAULT: 12_000,
  IMPORT: 60_000,
  HOT_MOUNT: 180_000,
} as const;

export const LOG_TAIL_LINES = 240;
export const LOG_LINE_MIN = 20;
export const LOG_LINE_MAX = 1_000;

export const FONT_SCALE = {
  MIN: 0.85,
  MAX: 1.3,
  STEP: 0.05,
} as const;

/** 宿主色板走远程 @import，首次读常为空，按这几个时刻补探 */
export const MONET_PROBE_DELAYS_MS = [200, 800, 2_000] as const;

export const EMPTY_PLACEHOLDER = "—";

export const DEFAULT_SD_CERT_DIR = "/sdcard/Documents/cacerts";
