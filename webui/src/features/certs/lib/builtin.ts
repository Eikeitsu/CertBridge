import { FlagTone, type BuiltinCertKind } from "@/entities/module/enums";
import { BUILTIN_CERTS } from "@/shared/config/certs";

export type BuiltinCertItem = {
  kind: BuiltinCertKind;
  title: string;
  isEnabled: boolean;
  isActive: boolean;
  isAvailable: boolean;
};

export type BuiltinCertFlag = {
  label: string;
  tone: FlagTone;
};

export function resolveBuiltinSubtitle(item: BuiltinCertItem): string {
  if (!item.isAvailable && !item.isActive) {
    return (
      BUILTIN_CERTS.find((cert) => cert.kind === item.kind)?.missingHint || "未检测到证书"
    );
  }
  if (!item.isEnabled && item.isActive) return "重启后才会从系统撤下";
  if (item.isEnabled && !item.isActive) return "重启后写入系统信任库";
  return "";
}

export function resolveBuiltinFlags(item: BuiltinCertItem): BuiltinCertFlag[] {
  if (!item.isAvailable && !item.isActive) return [];
  if (item.isEnabled && item.isActive) {
    return [{ label: "已应用", tone: FlagTone.Ok }];
  }
  if (item.isEnabled) return [{ label: "待重启", tone: FlagTone.Warn }];
  if (item.isActive) return [{ label: "仍在生效", tone: FlagTone.Warn }];
  return [{ label: "已关闭", tone: FlagTone.Info }];
}
