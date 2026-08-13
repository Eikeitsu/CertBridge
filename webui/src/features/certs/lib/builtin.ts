import type { BuiltinCertKind } from "@/entities/module/enums";
import { BUILTIN_CERTS } from "@/shared/config/certs";

export type BuiltinCertItem = {
  kind: BuiltinCertKind;
  title: string;
  isEnabled: boolean;
  isActive: boolean;
  isAvailable: boolean;
};

export function resolveBuiltinSubtitle(item: BuiltinCertItem): string {
  if (!item.isAvailable) {
    return (
      BUILTIN_CERTS.find((cert) => cert.kind === item.kind)?.missingHint || "未检测到证书"
    );
  }
  if (!item.isEnabled && item.isActive) {
    return "已关闭，仍在生效（重启后移除）· 点击查看详情";
  }
  if (item.isActive) return "已应用 · 点击查看详情";
  if (item.isEnabled) return "已开启，重启后生效 · 点击查看详情";
  return "已关闭 · 点击查看详情";
}
