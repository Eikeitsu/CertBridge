import { useEffect } from "react";
import {
  CHROME_SYNC_DELAYS,
  pinSafeInsets,
  restorePinnedInsets,
  syncChromeBars,
} from "@/features/theme/lib/chrome";
import type { ResolvedTheme, ThemePack } from "@/entities/module/enums";

const PIN_MS = 300;
const RESUME_PIN_MS = 280;

export function useImmersiveChrome(
  resolvedTheme: ResolvedTheme,
  isBarBlurEnabled: boolean,
  themePack: ThemePack,
  pathname: string,
) {
  useEffect(() => {
    pinSafeInsets(true);
    syncChromeBars(resolvedTheme, isBarBlurEnabled);
    const frame = requestAnimationFrame(() => {
      pinSafeInsets(false);
      syncChromeBars(resolvedTheme, isBarBlurEnabled);
    });
    const syncTimers = CHROME_SYNC_DELAYS.map((delay) =>
      window.setTimeout(() => {
        pinSafeInsets(false);
        syncChromeBars(resolvedTheme, isBarBlurEnabled);
      }, delay),
    );
    const pinTimer = window.setTimeout(() => pinSafeInsets(true), PIN_MS);

    const onViewportGlitch = () => restorePinnedInsets();
    const onResume = () => {
      restorePinnedInsets();
      syncChromeBars(resolvedTheme, isBarBlurEnabled);
      window.setTimeout(() => pinSafeInsets(true), RESUME_PIN_MS);
    };

    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);
    window.visualViewport?.addEventListener("resize", onViewportGlitch);
    window.visualViewport?.addEventListener("scroll", onViewportGlitch);

    return () => {
      cancelAnimationFrame(frame);
      syncTimers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(pinTimer);
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
      window.visualViewport?.removeEventListener("resize", onViewportGlitch);
      window.visualViewport?.removeEventListener("scroll", onViewportGlitch);
    };
  }, [resolvedTheme, isBarBlurEnabled, themePack]);

  useEffect(() => {
    restorePinnedInsets();
    syncChromeBars(resolvedTheme, isBarBlurEnabled);
  }, [pathname, resolvedTheme, isBarBlurEnabled]);
}
