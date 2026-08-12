import { useMemo } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import type { BuiltinCertKind } from "@/entities/module/types";

export type BuiltinCertItem = {
  kind: BuiltinCertKind;
  title: string;
  isEnabled: boolean;
  isActive: boolean;
  isAvailable: boolean;
};

export function useBuiltinCerts(): BuiltinCertItem[] {
  const status = useAppSelector(selectModuleStatus);

  return useMemo(
    () => [
      {
        kind: "reqable",
        title: isFlagOn(status.reqable_active)
          ? status.reqable_title || "Reqable"
          : status.reqable_display || "Reqable",
        isEnabled: isFlagOn(status.reqable_enabled),
        isActive: isFlagOn(status.reqable_active),
        isAvailable: isFlagOn(status.reqable_available),
      },
      {
        kind: "proxypin",
        title: isFlagOn(status.proxypin_active)
          ? status.proxypin_title || "ProxyPin"
          : status.proxypin_display || "ProxyPin",
        isEnabled: isFlagOn(status.proxypin_enabled),
        isActive: isFlagOn(status.proxypin_active),
        isAvailable: isFlagOn(status.proxypin_available),
      },
    ],
    [status],
  );
}

export function resolveBuiltinSubtitle(item: BuiltinCertItem): string {
  if (!item.isAvailable) {
    return item.kind === "reqable" ? "未检测到证书（请先在 App 中生成）" : "未检测到证书";
  }
  if (!item.isEnabled && item.isActive) {
    return "已关闭，仍在生效（重启后移除）· 点击查看详情";
  }
  if (item.isActive) return "已应用 · 点击查看详情";
  if (item.isEnabled) return "已开启，重启后生效 · 点击查看详情";
  return "已关闭 · 点击查看详情";
}
