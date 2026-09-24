import { useCallback, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { usePackCopy } from "@/features/theme/ui/PackCopyProvider";

/** Map i18n webui.json → legacy PackVoice shape used by hooks/pages */
export function usePackVoice() {
  const { pack, voice } = usePackCopy();
  return { pack, voice };
}

export function useApplyUiLang() {
  const { i18n } = useTranslation();
  return useCallback(
    (lng: "zh-CN" | "en") => {
      const cur = i18n.resolvedLanguage || i18n.language;
      if (cur === lng) {
        document.documentElement.lang = lng === "zh-CN" ? "zh-CN" : "en";
        return;
      }
      startTransition(() => {
        void i18n.changeLanguage(lng);
        document.documentElement.lang = lng === "zh-CN" ? "zh-CN" : "en";
      });
    },
    [i18n],
  );
}
