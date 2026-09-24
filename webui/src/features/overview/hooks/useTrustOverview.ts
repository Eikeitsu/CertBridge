import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/app/store/hooks";
import {
  selectCustomCertificates,
  selectDeviceLabel,
  selectDeviceName,
  selectLastRefreshedAt,
  selectModuleStatus,
  selectStatusError,
  selectStatusLoading,
} from "@/features/status/model/selectors";
import { resolveTrustLabel } from "@/shared/lib/sanitize";
import { isFlagOn } from "@/shared/lib/flag";
import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { BUILTIN_CERTS, builtinStatusKeys } from "@/shared/config/certs";
import { MOUNT_MODES, TMPFS_STYLES } from "@/shared/config/mount";
import { defaultStatusDesc, resolveApexLabel, resolveHotLabel } from "../lib/labels";
import { parseEnum } from "@/shared/lib/enum";
import {
  BuiltinCertKind,
  MountMode,
  TmpfsStyle,
  TrustTone,
} from "@/entities/module/enums";

export type BuiltinPipelineRow = {
  kind: BuiltinCertKind;
  title: string;
  enabled: boolean;
  active: boolean;
  available: boolean;
  stateLabel: string;
};

export function useTrustOverview() {
  const { t } = useTranslation("webui");
  const status = useAppSelector(selectModuleStatus);
  const customCertificates = useAppSelector(selectCustomCertificates);
  const deviceLabel = useAppSelector(selectDeviceLabel);
  const deviceName = useAppSelector(selectDeviceName);
  const isLoading = useAppSelector(selectStatusLoading);
  const lastRefreshedAt = useAppSelector(selectLastRefreshedAt);
  const statusError = useAppSelector(selectStatusError);

  const trust = useMemo(() => {
    if (statusError) {
      const isBridge = /桥接|KernelSU|WebUI|no_bridge|无法执行 shell/i.test(statusError);
      return {
        tone: TrustTone.Idle,
        title: statusError,
        hint: isBridge ? t("overview.bridgeHint") : t("overview.retryHint"),
      };
    }
    const statusReady =
      Boolean(status.desc_short) ||
      status.apex_ok === "0" ||
      status.apex_ok === "1" ||
      status.apex_ok === "2" ||
      isFlagOn(status.disabled) ||
      isFlagOn(status.inject_error) ||
      isFlagOn(status.pending_reboot);
    if (isLoading && !statusReady) {
      return {
        tone: TrustTone.Idle,
        title: t("overview.checking"),
        hint: t("overview.checkingHint"),
      };
    }
    return resolveTrustLabel(status);
  }, [status, statusError, isLoading, t]);

  const activeCount = Number(status.active_count || 0);
  const customCount = Number(status.custom_count || customCertificates.length || 0);
  const isPendingReboot = isFlagOn(status.pending_reboot);
  const isHotMountActive = isFlagOn(status.hot_active);
  const isHotMountSupported = isFlagOn(status.hot_supported);
  const isDisabled = isFlagOn(status.disabled);
  const isHotPartial = isFlagOn(status.hot_partial);
  const isHotStale = isFlagOn(status.hot_stale);
  const isHotAllow = isFlagOn(status.hot_allow);

  const activeNames = useMemo(() => {
    const names: string[] = [];
    for (const cert of BUILTIN_CERTS) {
      const keys = builtinStatusKeys(cert.kind);
      if (!isFlagOn(status[keys.active])) continue;
      names.push(status[keys.title] || status[keys.display] || cert.fallbackTitle);
    }
    for (const cert of customCertificates) {
      names.push(cert.display || cert.name);
    }
    return names;
  }, [status, customCertificates]);

  const builtinPipeline = useMemo((): BuiltinPipelineRow[] => {
    return BUILTIN_CERTS.map((cert) => {
      const keys = builtinStatusKeys(cert.kind);
      const enabled = isFlagOn(status[keys.enabled]);
      const active = isFlagOn(status[keys.active]);
      const available = isFlagOn(status[keys.available]);
      let stateLabel = t("overview.stateMissing");
      if (enabled && active) stateLabel = t("overview.stateApplied");
      else if (enabled && !active) stateLabel = t("overview.statePendingWrite");
      else if (!enabled && active) stateLabel = t("overview.stateStillActive");
      else if (available) stateLabel = t("overview.stateReadyOff");
      return {
        kind: cert.kind,
        title: status[keys.title] || status[keys.display] || cert.fallbackTitle,
        enabled,
        active,
        available,
        stateLabel,
      };
    });
  }, [status, t]);

  const trustScore = useMemo(() => {
    if (statusError || isDisabled) return 12;
    if (isFlagOn(status.inject_error)) return 28;
    if (trust.tone === TrustTone.Idle) return 40;
    if (isPendingReboot) return 62;
    if (activeCount > 0 && trust.tone === TrustTone.Ok) return 96;
    if (activeCount > 0) return 78;
    return 52;
  }, [
    statusError,
    isDisabled,
    status.inject_error,
    trust.tone,
    isPendingReboot,
    activeCount,
  ]);

  const mountMode = parseEnum(MountMode, status.mount_mode, MountMode.Compatible);
  const tmpfsStyle = parseEnum(TmpfsStyle, status.tmpfs_style, TmpfsStyle.Dev);
  const deviceFallback = t("overview.deviceFallback");

  return {
    status,
    trust,
    isLoading,
    activeCount,
    customCount,
    isPendingReboot,
    isHotMountActive,
    isHotMountSupported,
    isDisabled,
    isHotPartial,
    isHotStale,
    isHotAllow,
    trustScore,
    deviceLabel: deviceLabel || deviceFallback,
    deviceName: deviceName || deviceLabel || deviceFallback,
    rootLabel: status.root || EMPTY_PLACEHOLDER,
    apexLabel: resolveApexLabel(status.apex_ok),
    mountModeLabel: t(MOUNT_MODES[mountMode].shortLabelKey),
    mountModeMeta: t(MOUNT_MODES[mountMode].metaKey),
    tmpfsLabel: t(TMPFS_STYLES[tmpfsStyle].labelKey),
    tmpfsMeta: t(TMPFS_STYLES[tmpfsStyle].metaKey),
    androidLabel: status.release
      ? `Android ${status.release}${status.api ? ` · API ${status.api}` : ""}`
      : EMPTY_PLACEHOLDER,
    apiLabel: status.api || EMPTY_PLACEHOLDER,
    versionLabel: status.version || EMPTY_PLACEHOLDER,
    hotStatusLabel: resolveHotLabel(status),
    hotAdded: status.hot_added || "0",
    hotNamespaces: status.hot_namespaces || "0",
    hotFailed: status.hot_failed || "0",
    hotMode: status.hot_mode || EMPTY_PLACEHOLDER,
    lastRefreshedAt: lastRefreshedAt || EMPTY_PLACEHOLDER,
    activeNames,
    builtinPipeline,
    baselineCount: status.base_count || EMPTY_PLACEHOLDER,
    storeCount: status.store_count || EMPTY_PLACEHOLDER,
    description: status.desc_body || defaultStatusDesc(),
    shortDesc: status.desc_short || trust.title,
    injectDiagnosis: isFlagOn(status.inject_error)
      ? {
          message: status.inject_message || "",
          hint: status.inject_hint || "",
          reason: status.inject_reason || "",
        }
      : null,
    version: status.version,
    customCertificates,
  };
}

export type TrustOverview = ReturnType<typeof useTrustOverview>;
