import type { ResolvedTheme } from "@/entities/module/types";

export function syncChromeBars(resolved: ResolvedTheme, _barBlur: boolean) {
  const dark = resolved === "dark";
  const bg = dark ? "#0B1220" : "#F0FDFA";
  const host = window.$CertBridge || window.mmrl;
  try {
    host?.setStatusBarColor?.(bg, !dark);
    host?.setNavigationBarColor?.(bg, !dark);
  } catch {
    /* ignore */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0B1220" : "#0F766E");
}

export function restoreChromeInsets() {
  const host = window.$CertBridge || window.mmrl;
  try {
    host?.setInsets?.("");
  } catch {
    /* ignore */
  }
  syncChromeBars(
    (document.documentElement.dataset.theme as "light" | "dark") || "light",
    document.documentElement.dataset.barBlur === "1",
  );
}
