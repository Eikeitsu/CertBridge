import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TabName } from "@/entities/module/enums";

/** Pack chrome strings (tabs / page titles) from i18n */
export function usePackChrome() {
  const { t, i18n } = useTranslation("webui");
  return useMemo(
    () => ({
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
    }),
    [t, i18n.language],
  );
}
