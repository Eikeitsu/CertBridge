import type { ResolvedTheme } from "@/entities/module/types";
import { cssColorToHex, relativeLuminanceCss } from "@/shared/lib/color";

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
  const candidates = ["--cb-chrome", "--cb-body-gradient-base", "--cb-paper"];
  for (const name of candidates) {
    const raw = styles.getPropertyValue(name).trim();
    if (!raw) continue;
    const hex = cssColorToHex(raw, "");
    if (hex) return hex;
  }
  return resolved === "dark" ? "#0B1220" : "#F4F7F6";
}

/**
 * 钉死安全区：下拉回弹时 WebView 常短暂报 0，导致顶/底栏「接不住」。
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
  const lightIcons = relativeLuminanceCss(bg) > 0.45;

  document.documentElement.style.backgroundColor = bg;
  if (document.body) document.body.style.backgroundColor = bg;
  document.documentElement.style.colorScheme =
    resolved === "dark" ? "only dark" : "only light";

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", bg);

  applyNativeBars(bg, lightIcons);
}

export function restoreChromeInsets() {
  const host = readChromeHost();
  try {
    // 清空宿主可能注入的错误 inset，改由 CSS 安全区驱动
    host?.setInsets?.("");
  } catch {
    /* ignore */
  }
  const theme = (document.documentElement.dataset.theme as "light" | "dark") || "light";
  const barBlur = document.documentElement.dataset.barBlur === "1";
  pinSafeInsets(true);
  syncChromeBars(theme, barBlur);
  requestAnimationFrame(() => syncChromeBars(theme, barBlur));
  window.setTimeout(() => syncChromeBars(theme, barBlur), 120);
  window.setTimeout(() => syncChromeBars(theme, barBlur), 400);
}
