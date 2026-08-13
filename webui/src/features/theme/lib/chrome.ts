import { ResolvedTheme } from "@/entities/module/enums";
import { cssColorToHex, relativeLuminanceCss } from "@/shared/lib/color";
import { FLAG_ON } from "@/shared/config/constants";
import { parseEnum } from "@/shared/lib/enum";

const CHROME_BG_VARS = ["--cb-chrome", "--cb-body-gradient-base", "--cb-paper"];
const FALLBACK_BG: Record<ResolvedTheme, string> = {
  [ResolvedTheme.Light]: "#F4F7F6",
  [ResolvedTheme.Dark]: "#0B1220",
};
const LUMINANCE_LIGHT = 0.45;
const RESTORE_DELAYS = [50, 200, 450, 700];
export const CHROME_SYNC_DELAYS = [120, 400];

type ChromeHost = {
  setInsets?: (css: string) => void;
  setStatusBarColor?: (color: string, light?: boolean) => void;
  setNavigationBarColor?: (color: string, light?: boolean) => void;
  setLightStatusBars?: (light: boolean) => void;
  setLightNavigationBars?: (light: boolean) => void;
};

function readChromeHost(): ChromeHost | undefined {
  const win = window as unknown as Window & Record<string, ChromeHost | undefined>;
  if (win.$CertBridge) return win.$CertBridge;
  if (win.mmrl) return win.mmrl;
  for (const key of Object.keys(win)) {
    if (key.charAt(0) !== "$") continue;
    const api = win[key];
    if (
      api &&
      (typeof api.setStatusBarColor === "function" ||
        typeof api.setLightStatusBars === "function")
    ) {
      return api;
    }
  }
  return undefined;
}

/** 读取页面沉浸底色（必须是实色，系统栏不支持渐变） */
function readChromeBg(resolved: ResolvedTheme): string {
  const styles = getComputedStyle(document.documentElement);
  for (const name of CHROME_BG_VARS) {
    const raw = styles.getPropertyValue(name).trim();
    if (!raw) continue;
    const hex = cssColorToHex(raw, "");
    if (hex) return hex;
  }
  return FALLBACK_BG[resolved];
}

/** 仅恢复已钉死的安全区，不清 pin、不重测（刷新/回弹时用） */
export function restorePinnedInsets(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const pinnedTop = root.style.getPropertyValue("--cb-inset-top-pinned").trim();
  const pinnedBottom = root.style.getPropertyValue("--cb-inset-bottom-pinned").trim();
  if (pinnedTop) root.style.setProperty("--cb-inset-top", pinnedTop);
  if (pinnedBottom) root.style.setProperty("--cb-inset-bottom", pinnedBottom);
}

/**
 * 钉死安全区：下拉回弹时 WebView 常短暂报 0，导致顶/底栏「接不住」。
 * force 仅用于旋转/首次进入等需要重测的场景。
 */
export function pinSafeInsets(force = false): void {
  if (!document.body) return;
  const root = document.documentElement;
  if (force) {
    root.style.removeProperty("--cb-inset-top-pinned");
    root.style.removeProperty("--cb-inset-bottom-pinned");
  }

  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
    "padding-top:var(--window-inset-top, env(safe-area-inset-top, 0px));" +
    "padding-bottom:var(--window-inset-bottom, env(safe-area-inset-bottom, 0px));";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  const top = computed.paddingTop;
  const bottom = computed.paddingBottom;
  document.body.removeChild(probe);

  const pinnedTop = root.style.getPropertyValue("--cb-inset-top-pinned").trim();
  const pinnedBottom = root.style.getPropertyValue("--cb-inset-bottom-pinned").trim();

  if (top && top !== "0px") {
    root.style.setProperty("--cb-inset-top", top);
    root.style.setProperty("--cb-inset-top-pinned", top);
  } else if (pinnedTop) {
    root.style.setProperty("--cb-inset-top", pinnedTop);
  }

  if (bottom && bottom !== "0px") {
    root.style.setProperty("--cb-inset-bottom", bottom);
    root.style.setProperty("--cb-inset-bottom-pinned", bottom);
  } else if (pinnedBottom) {
    root.style.setProperty("--cb-inset-bottom", pinnedBottom);
  }
}

function scheduleInsetRestore(): void {
  restorePinnedInsets();
  requestAnimationFrame(() => restorePinnedInsets());
  for (const delay of RESTORE_DELAYS) {
    window.setTimeout(() => restorePinnedInsets(), delay);
  }
}

function applyNativeBars(bg: string, lightContentIcons: boolean): void {
  const host = readChromeHost();
  try {
    // light=true → 深色图标（浅底）；light=false → 浅色图标（深底）
    host?.setStatusBarColor?.(bg, lightContentIcons);
    host?.setNavigationBarColor?.(bg, lightContentIcons);
    host?.setLightStatusBars?.(lightContentIcons);
    host?.setLightNavigationBars?.(lightContentIcons);
  } catch {
    /* ignore */
  }
}

/**
 * 状态栏 / 导航栏 / 小白条沉浸同步：
 * 与页面 `--cb-chrome` 同色，杜绝「半截颜色」。
 */
export function syncChromeBars(resolved: ResolvedTheme, _barBlur: boolean) {
  pinSafeInsets(false);
  const bg = readChromeBg(resolved);
  const lightIcons = relativeLuminanceCss(bg) > LUMINANCE_LIGHT;

  document.documentElement.style.backgroundColor = bg;
  if (document.body) document.body.style.backgroundColor = bg;
  document.documentElement.style.colorScheme =
    resolved === ResolvedTheme.Dark ? "only dark" : "only light";

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", bg);

  applyNativeBars(bg, lightIcons);
}

/**
 * 刷新/列表操作后：只恢复钉死 inset，禁止清空宿主或 force 重测（否则顶栏高度塌陷）。
 */
export function restoreChromeInsets() {
  const theme = parseEnum(
    ResolvedTheme,
    document.documentElement.dataset.theme,
    ResolvedTheme.Light,
  );
  const barBlur = document.documentElement.dataset.barBlur === FLAG_ON;
  scheduleInsetRestore();
  syncChromeBars(theme, barBlur);
  requestAnimationFrame(() => syncChromeBars(theme, barBlur));
  for (const delay of CHROME_SYNC_DELAYS) {
    window.setTimeout(() => syncChromeBars(theme, barBlur), delay);
  }
}
