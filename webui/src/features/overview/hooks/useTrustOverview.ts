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

const DEFAULT_STATUS_DESC =
  "安全合并 Reqable / ProxyPin / 自定义 CA，并支持用户区、存储卡证书免重启挂载与无痕卸载。";

function resolveApexLabel(apexOk?: string): string {
  if (apexOk === "2") return "N/A";
  if (apexOk === "1") return "已注入";
  return "失败";
}

function resolveHotLabel(status: {
  hot_supported?: string;
  hot_stale?: string;
  hot_active?: string;
  hot_partial?: string;
}): string {
  if (!isFlagOn(status.hot_supported)) return "N/A";
  if (isFlagOn(status.hot_stale)) return "异常";
  if (isFlagOn(status.hot_active)) {
    return isFlagOn(status.hot_partial) ? "部分" : "已挂载";
  }
  return "未挂载";
}

export function useTrustOverview() {
  const status = useAppSelector(selectModuleStatus);
  const customCertificates = useAppSelector(selectCustomCertificates);
  const isLoading = useAppSelector(selectStatusLoading);
  const lastRefreshedAt = useAppSelector(selectLastRefreshedAt);
  const statusError = useAppSelector(selectStatusError);
  const trust = useMemo(() => {
    if (statusError) {
      return { tone: "idle" as const, title: statusError, hint: "当前环境无法执行 shell" };
    }
    return resolveTrustLabel(status);
  }, [status, statusError]);

  const activeCount = Number(status.active_count || 0);
  const customCount = Number(
    status.custom_count || customCertificates.length || 0,
  );
  const isPendingReboot = isFlagOn(status.pending_reboot);
  const isHotMountActive = isFlagOn(status.hot_active);
  const isHotMountSupported = isFlagOn(status.hot_supported);

  const activeNames = useMemo(() => {
    const names: string[] = [];
    if (isFlagOn(status.reqable_active)) {
      names.push(status.reqable_title || status.reqable_display || "Reqable");
    }
    if (isFlagOn(status.proxypin_active)) {
      names.push(
        status.proxypin_title || status.proxypin_display || "ProxyPin",
      );
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
    mountModeLabel: status.mount_mode === "magic" ? "轻量" : "兼容",
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
