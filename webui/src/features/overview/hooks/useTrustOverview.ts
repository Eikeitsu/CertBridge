import { useMemo } from "react";
import { useAppSelector } from "@/app/store/hooks";
import {
  selectCustomCertificates,
  selectLastRefreshedAt,
  selectModuleStatus,
  selectStatusError,
  selectStatusLoading,
} from "@/features/status/model/selectors";
import { resolveTrustLabel } from "@/shared/lib/sanitize";
import { isFlagOn } from "@/shared/lib/flag";
import { EMPTY_PLACEHOLDER } from "@/shared/config/constants";
import { BUILTIN_CERTS, builtinStatusKeys } from "@/shared/config/certs";
import { MOUNT_MODES } from "@/shared/config/mount";
import { DEFAULT_STATUS_DESC } from "../lib/labels";
import { parseEnum } from "@/shared/lib/enum";
import { MountMode, TrustTone } from "@/entities/module/enums";
import { resolveApexLabel, resolveHotLabel } from "../lib/labels";

export function useTrustOverview() {
  const status = useAppSelector(selectModuleStatus);
  const customCertificates = useAppSelector(selectCustomCertificates);
  const isLoading = useAppSelector(selectStatusLoading);
  const lastRefreshedAt = useAppSelector(selectLastRefreshedAt);
  const statusError = useAppSelector(selectStatusError);
  const trust = useMemo(() => {
    if (statusError) {
      return {
        tone: TrustTone.Idle,
        title: statusError,
        hint: "当前环境无法执行 shell",
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
        title: "检测中…",
        hint: "正在读取模块状态",
      };
    }
    return resolveTrustLabel(status);
  }, [status, statusError, isLoading]);

  const activeCount = Number(status.active_count || 0);
  const customCount = Number(status.custom_count || customCertificates.length || 0);
  const isPendingReboot = isFlagOn(status.pending_reboot);
  const isHotMountActive = isFlagOn(status.hot_active);
  const isHotMountSupported = isFlagOn(status.hot_supported);

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

  return {
    status,
    trust,
    isLoading,
    activeCount,
    customCount,
    isPendingReboot,
    isHotMountActive,
    isHotMountSupported,
    rootLabel: status.root || "--",
    apexLabel: resolveApexLabel(status.apex_ok),
    mountModeLabel:
      MOUNT_MODES[parseEnum(MountMode, status.mount_mode, MountMode.Compatible)]
        .shortLabel,
    androidLabel: status.release || "--",
    versionLabel: status.version || "--",
    hotStatusLabel: resolveHotLabel(status),
    lastRefreshedAt: lastRefreshedAt || "--",
    activeNames,
    baselineCount: status.base_count || EMPTY_PLACEHOLDER,
    storeCount: status.store_count || EMPTY_PLACEHOLDER,
    description: status.desc_body || DEFAULT_STATUS_DESC,
    injectDiagnosis: isFlagOn(status.inject_error)
      ? {
          message: status.inject_message || "",
          hint: status.inject_hint || "",
        }
      : null,
    version: status.version,
  };
}
