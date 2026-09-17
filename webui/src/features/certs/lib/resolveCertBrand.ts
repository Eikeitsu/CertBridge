import { BuiltinCertKind } from "@/entities/module/enums";

export function resolveCertBrandKind(
  sourceId?: string,
  displayName?: string,
  filename?: string,
): BuiltinCertKind | undefined {
  if (sourceId === BuiltinCertKind.Reqable || sourceId === BuiltinCertKind.Proxypin) {
    return sourceId;
  }
  const hay = [sourceId, displayName, filename].filter(Boolean).join(" ").toLowerCase();
  if (hay.includes("reqable")) return BuiltinCertKind.Reqable;
  if (hay.includes("proxypin") || hay.includes("proxy pin"))
    return BuiltinCertKind.Proxypin;
  return undefined;
}
