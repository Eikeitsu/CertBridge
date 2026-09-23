import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import { selectThemePack } from "@/features/theme/model/selectors";
import { ThemePack } from "@/entities/module/enums";
import type { PackVoice } from "@/shared/config/packVoice";
import { CONSOLE_VOICE } from "@/packs/console/voice";
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

/** 终端壳层文案固定英文（设计气质），不跟 UI 语言走 */
function consoleChrome(): PackChrome {
  return {
    brand: CONSOLE_VOICE.brand,
    loading: CONSOLE_VOICE.loading,
    tabs: { ...CONSOLE_VOICE.tabs },
    home: {
      eyebrow: CONSOLE_VOICE.home.eyebrow,
      refresh: CONSOLE_VOICE.home.refresh,
      reboot: CONSOLE_VOICE.home.reboot,
      empty: CONSOLE_VOICE.home.empty,
      metrics: { ...CONSOLE_VOICE.home.metrics },
      pipeline: CONSOLE_VOICE.home.pipeline,
      env: CONSOLE_VOICE.home.env,
    },
    certs: { ...CONSOLE_VOICE.certs },
    log: { ...CONSOLE_VOICE.log },
    hide: { ...CONSOLE_VOICE.hide },
    more: { ...CONSOLE_VOICE.more },
  };
}

/** 每种语言只构建一次文案树，避免各页 hooks 重复 t() + 切语言时 N 次重建 */
export function PackCopyProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation("webui");
  const pack = useAppSelector(selectThemePack);
  const lang = i18n.resolvedLanguage || i18n.language || "en";
  const value = useMemo<PackCopyValue>(
    () => ({
      pack,
      voice: buildPackVoice(t),
      chrome: pack === ThemePack.Console ? consoleChrome() : buildPackChrome(t),
    }),
    // t 随 languageChanged 更新；用 lang 作稳定依赖，避免无意义重建
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: rebuild only on lang/pack
    [lang, pack],
  );
  return <PackCopyContext.Provider value={value}>{children}</PackCopyContext.Provider>;
}

export function usePackCopy(): PackCopyValue {
  const ctx = useContext(PackCopyContext);
  const { t, i18n } = useTranslation("webui");
  const pack = useAppSelector(selectThemePack);
  const lang = i18n.resolvedLanguage || i18n.language || "en";
  const fallback = useMemo(
    () => ({
      pack,
      voice: buildPackVoice(t),
      chrome: pack === ThemePack.Console ? consoleChrome() : buildPackChrome(t),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, pack],
  );
  return ctx ?? fallback;
}
