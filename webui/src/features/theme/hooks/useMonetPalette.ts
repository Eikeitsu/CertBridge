import { useEffect, useState } from "react";
import { MONET_PROBE_DELAYS_MS } from "@/shared/config/constants";
import { hasMonetPalette } from "../lib/applyTheme";

/** 宿主是否提供了莫奈色板；colors.css 是远程 @import，需要延迟补探几次 */
export function useMonetPalette(): boolean {
  const [isReady, setIsReady] = useState(hasMonetPalette);

  useEffect(() => {
    if (isReady) return;
    const timers = MONET_PROBE_DELAYS_MS.map((delay) =>
      window.setTimeout(() => {
        if (hasMonetPalette()) setIsReady(true);
      }, delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isReady]);

  return isReady;
}
