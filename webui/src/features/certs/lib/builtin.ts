import i18n from "@/shared/i18n";
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
    const meta = BUILTIN_CERTS.find((cert) => cert.kind === item.kind);
    return i18n.t(meta?.missingHintKey || "certs.subMissing");
  }
  if (!item.isEnabled && item.isActive) return i18n.t("certs.subRemovePending");
  if (item.isEnabled && !item.isActive) return i18n.t("certs.subWritePending");
  return "";
}

export function resolveBuiltinFlags(item: BuiltinCertItem): BuiltinCertFlag[] {
  if (!item.isAvailable && !item.isActive) return [];
  if (item.isEnabled && item.isActive) {
    return [{ label: i18n.t("certs.flagApplied"), tone: FlagTone.Ok }];
  }
  if (item.isEnabled)
    return [{ label: i18n.t("certs.flagPending"), tone: FlagTone.Warn }];
  if (item.isActive)
    return [{ label: i18n.t("certs.flagStillActive"), tone: FlagTone.Warn }];
  return [{ label: i18n.t("certs.flagOff"), tone: FlagTone.Info }];
}
