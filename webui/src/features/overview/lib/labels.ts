import i18n from "@/shared/i18n";
import { isFlagOn } from "@/shared/lib/flag";

export function defaultStatusDesc(): string {
  return i18n.t("trust.defaultDesc");
}

/** @deprecated use defaultStatusDesc() */
export const DEFAULT_STATUS_DESC = "";

export function resolveApexLabel(apexOk?: string): string {
  if (apexOk === "2") return "N/A";
  if (apexOk === "1") return i18n.t("overview.apexInjected");
  return i18n.t("overview.apexFail");
}

export function resolveHotLabel(status: {
  hot_supported?: string;
  hot_stale?: string;
  hot_active?: string;
  hot_partial?: string;
}): string {
  if (!isFlagOn(status.hot_supported)) return "N/A";
  if (isFlagOn(status.hot_stale)) return i18n.t("overview.hotAbnormal");
  if (isFlagOn(status.hot_active)) {
    return isFlagOn(status.hot_partial)
      ? i18n.t("overview.hotPartial")
      : i18n.t("overview.hotMounted");
  }
  return i18n.t("overview.hotIdle");
}
