import { TabName } from "@/entities/module/enums";

/** Legacy shape kept for pack pages; content now comes from i18n via usePackVoice */
export type PackVoice = {
  brand: string;
  loadingHint: string;
  tabs: Record<TabName, string>;
  overview: {
    kicker: string;
    emptyActive: string;
    metrics: {
      active: string;
      custom: string;
      baseline: string;
      store: string;
    };
    pipelineTitle: string;
    runtimeTitle: string;
    refresh: string;
    reboot: string;
  };
  certs: Record<string, string>;
  log: {
    title: string;
    metaEmpty: string;
    refresh: string;
    clear: string;
    emptyFiltered: string;
    emptyAll: string;
  };
  hide: Record<string, string>;
  more: {
    appearanceTitle: string;
    appearanceMeta: string;
    aboutTitle: string;
    hubMeta: string;
    mountTitle: string;
    mountMeta: string;
    navTitle: string;
    navMeta: string;
    showHideTitle: string;
    showHideDesc: string;
  };
  topbar: {
    showBrand: boolean;
    showDevice: boolean;
  };
};

/** @deprecated use usePackVoice / i18n */
export const APP_VOICE = {} as PackVoice;

/** @deprecated pack no longer switches language */
export function getPackVoice(): PackVoice {
  return APP_VOICE;
}
