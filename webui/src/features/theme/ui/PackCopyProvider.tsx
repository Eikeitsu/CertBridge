import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ThemePack } from "@/entities/module/enums";
import type { PackVoice } from "@/shared/config/packVoice";
import {
  buildPackChrome,
  buildPackVoice,
  type PackChrome,
} from "@/features/theme/lib/packCopy";

type PackCopyValue = {
  pack: ThemePack;
  voice: PackVoice;
  chrome: PackChrome;
};

const PackCopyContext = createContext<PackCopyValue | null>(null);

/** 每种语言只构建一次文案树，避免各页 hooks 重复 t() + 切语言时 N 次重建 */
export function PackCopyProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation("webui");
  const lang = i18n.resolvedLanguage || i18n.language || "en";
  const value = useMemo<PackCopyValue>(
    () => ({
      pack: ThemePack.Default,
      voice: buildPackVoice(t),
      chrome: buildPackChrome(t),
    }),
    // t 随 languageChanged 更新；用 lang 作稳定依赖，避免无意义重建
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: rebuild only on lang
    [lang],
  );
  return <PackCopyContext.Provider value={value}>{children}</PackCopyContext.Provider>;
}

export function usePackCopy(): PackCopyValue {
  const ctx = useContext(PackCopyContext);
  const { t, i18n } = useTranslation("webui");
  const lang = i18n.resolvedLanguage || i18n.language || "en";
  const fallback = useMemo(
    () => ({
      pack: ThemePack.Default,
      voice: buildPackVoice(t),
      chrome: buildPackChrome(t),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
  return ctx ?? fallback;
}
