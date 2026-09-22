import { TabName, ThemePack } from "@/entities/module/enums";
import type { PackVoice } from "@/shared/config/packVoice";
import type { TFunction } from "i18next";

const HIDE_VOICE_KEYS = [
  "switchTitle",
  "switchMeta",
  "allowTitle",
  "allowOn",
  "allowOff",
  "toastOn",
  "toastOff",
  "confirmOffTitle",
  "confirmOffBody",
  "confirmOffOk",
  "forceBindTitle",
  "forceBindOn",
  "forceBindOff",
  "forceBindToastOn",
  "forceBindToastOff",
  "forceBindConfirmOnTitle",
  "forceBindConfirmOnBody",
  "forceBindConfirmOnOk",
  "lateInjectTitle",
  "lateInjectOn",
  "lateInjectOff",
  "lateInjectToastOn",
  "lateInjectToastOff",
  "lateInjectConfirmOnTitle",
  "lateInjectConfirmOnBody",
  "lateInjectConfirmOnOk",
  "experimentEntryTitle",
  "experimentEntryMeta",
  "experimentEntryCta",
  "experimentSheetTitle",
  "experimentIntro",
  "bootZygoteTitle",
  "bootZygoteOn",
  "bootZygoteOff",
  "bootZygoteToastOn",
  "bootZygoteToastOff",
  "bootZygoteConfirmOnTitle",
  "bootZygoteConfirmOnBody",
  "bootZygoteConfirmOnOk",
  "bootMultiApexTitle",
  "bootMultiApexOn",
  "bootMultiApexOff",
  "bootMultiApexToastOn",
  "bootMultiApexToastOff",
  "bootMultiApexConfirmOnTitle",
  "bootMultiApexConfirmOnBody",
  "bootMultiApexConfirmOnOk",
  "serviceProbeTitle",
  "serviceProbeOn",
  "serviceProbeOff",
  "serviceProbeToastOn",
  "serviceProbeToastOff",
  "znSwitchTitle",
  "znSwitchMeta",
  "znAllowTitle",
  "znAllowOn",
  "znAllowOff",
  "znToastOn",
  "znToastOff",
  "znConfirmOffTitle",
  "znConfirmOffBody",
  "znConfirmOffOk",
  "znMissingTitle",
  "znMissingMeta",
  "znMissingBody",
  "loaderWarnTitle",
  "loaderWarnMeta",
  "loaderWarnBody",
  "whitelistTitle",
  "whitelistMeta",
  "whitelistHint",
  "whitelistSave",
  "whitelistSaved",
  "checklistTitle",
  "checklistMeta",
  "checklistDismiss",
  "captureTitle",
  "captureMeta",
  "introTitle",
  "introBody",
  "guideTitle",
  "guideMeta",
  "docsCta",
] as const;

export type PackChrome = {
  brand: string;
  loading: string;
  tabs: Record<TabName, string>;
  home: {
    eyebrow: string;
    refresh: string;
    reboot: string;
    empty: string;
    metrics: { active: string; custom: string; baseline: string };
    pipeline: string;
    env: string;
  };
  certs: {
    title: string;
    sub: string;
    builtin: string;
    custom: string;
    import: string;
    refresh: string;
    hot: string;
    empty: string;
  };
  log: { title: string; refresh: string; clear: string; empty: string };
  hide: { title: string; sub: string };
  more: {
    title: string;
    appearance: string;
    appearanceMeta: string;
    about: string;
  };
};

export function buildPackVoice(t: TFunction<"webui">): PackVoice {
  const tabs = {
    [TabName.Home]: t("tabs.home"),
    [TabName.Certs]: t("tabs.certs"),
    [TabName.Log]: t("tabs.log"),
    [TabName.Hide]: t("tabs.hide"),
    [TabName.More]: t("tabs.more"),
  };
  return {
    brand: t("brand"),
    loadingHint: t("loadingHint"),
    tabs,
    overview: {
      kicker: t("overview.kicker"),
      emptyActive: t("overview.emptyActive"),
      metrics: {
        active: t("overview.metrics.active"),
        custom: t("overview.metrics.custom"),
        baseline: t("overview.metrics.baseline"),
        store: t("overview.metrics.store"),
      },
      pipelineTitle: t("overview.pipelineTitle"),
      runtimeTitle: t("overview.runtimeTitle"),
      refresh: t("overview.refresh"),
      reboot: t("overview.reboot"),
    },
    certs: {
      builtinTitle: t("certs.builtinTitle"),
      builtinMeta: t("certs.builtinMeta"),
      customTitle: t("certs.customTitle"),
      customEmpty: t("certs.customEmpty"),
      importLabel: t("certs.importLabel"),
      detailLabel: t("certs.detailLabel"),
      refresh: t("certs.refresh"),
      hotTitle: t("certs.hotTitle"),
      presetsTitle: t("certs.presetsTitle"),
      presetsMeta: t("certs.presetsMeta"),
      exportFps: t("certs.exportFps"),
      exportFpsEmpty: t("certs.exportFpsEmpty"),
      exportFpsOk: t("certs.exportFpsOk"),
      presetUnchanged: t("certs.presetUnchanged"),
      importReadFail: t("certs.importReadFail"),
      removeConfirmTitle: t("certs.removeConfirmTitle"),
      removeConfirmBody: t("certs.removeConfirmBody"),
      removeConfirmOk: t("certs.removeConfirmOk"),
      hotAllowOn: t("certs.hotAllowOn"),
      hotAllowOff: t("certs.hotAllowOff"),
      hotConfirmOffTitle: t("certs.hotConfirmOffTitle"),
      hotConfirmOffBody: t("certs.hotConfirmOffBody"),
      hotConfirmOffOk: t("certs.hotConfirmOffOk"),
      hotSdPathBad: t("certs.hotSdPathBad"),
      hotMountConfirmBody: t("certs.hotMountConfirmBody"),
      hotMountConfirmOk: t("certs.hotMountConfirmOk"),
      hotMounting: t("certs.hotMounting"),
      hotUnmountConfirmTitle: t("certs.hotUnmountConfirmTitle"),
      hotUnmountConfirmBody: t("certs.hotUnmountConfirmBody"),
      hotUnmountConfirmOk: t("certs.hotUnmountConfirmOk"),
      hotUnmounting: t("certs.hotUnmounting"),
      hotUnmounted: t("certs.hotUnmounted"),
    },
    log: {
      title: t("log.title"),
      metaEmpty: t("log.metaEmpty"),
      refresh: t("log.refresh"),
      clear: t("log.clear"),
      emptyFiltered: t("log.emptyFiltered"),
      emptyAll: t("log.emptyAll"),
    },
    hide: Object.fromEntries(
      HIDE_VOICE_KEYS.map((k) => [k, t(`hide.${k}`)]),
    ) as PackVoice["hide"],
    more: {
      appearanceTitle: t("more.appearanceTitle"),
      appearanceMeta: t("more.appearanceMeta"),
      aboutTitle: t("more.aboutTitle"),
      hubMeta: t("more.hubMeta"),
      mountTitle: t("more.mountTitle"),
      mountMeta: t("more.mountMeta"),
      navTitle: t("more.navTitle"),
      navMeta: t("more.navMeta"),
      showHideTitle: t("more.showHideTitle"),
      showHideDesc: t("more.showHideDesc"),
    },
    topbar: { showBrand: true, showDevice: true },
  };
}

export function buildPackChrome(t: TFunction<"webui">): PackChrome {
  return {
    brand: t("brand"),
    loading: t("loadingHint"),
    tabs: {
      [TabName.Home]: t("tabs.home"),
      [TabName.Certs]: t("tabs.certs"),
      [TabName.Log]: t("tabs.log"),
      [TabName.Hide]: t("tabs.hide"),
      [TabName.More]: t("tabs.more"),
    },
    home: {
      eyebrow: t("overview.kicker"),
      refresh: t("overview.refresh"),
      reboot: t("overview.reboot"),
      empty: t("overview.emptyActive"),
      metrics: {
        active: t("overview.metrics.active"),
        custom: t("overview.metrics.custom"),
        baseline: t("overview.metrics.baseline"),
      },
      pipeline: t("overview.pipelineTitle"),
      env: t("overview.runtimeTitle"),
    },
    certs: {
      title: t("certs.builtinTitle"),
      sub: t("certs.builtinMeta"),
      builtin: t("certs.builtinTitle"),
      custom: t("certs.customTitle"),
      import: t("certs.importLabel"),
      refresh: t("certs.refresh"),
      hot: t("certs.hotTitle"),
      empty: t("certs.customEmpty"),
    },
    log: {
      title: t("log.title"),
      refresh: t("log.refresh"),
      clear: t("log.clear"),
      empty: t("log.emptyAll"),
    },
    hide: {
      title: t("hide.introTitle"),
      sub: t("hide.introBody"),
    },
    more: {
      title: t("tabs.more"),
      appearance: t("more.appearanceTitle"),
      appearanceMeta: t("more.appearanceMeta"),
      about: t("more.aboutTitle"),
    },
  };
}

export { ThemePack };
