import { useMemo } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { selectModuleStatus } from "@/features/status/model/selectors";
import { isFlagOn } from "@/shared/lib/flag";
import { BUILTIN_CERTS, builtinStatusKeys } from "@/shared/config/certs";
import type { BuiltinCertItem } from "../lib/builtin";

export type { BuiltinCertItem } from "../lib/builtin";

export function useBuiltinCerts(): BuiltinCertItem[] {
  const status = useAppSelector(selectModuleStatus);

  return useMemo(
    () =>
      BUILTIN_CERTS.map((cert) => {
        const keys = builtinStatusKeys(cert.kind);
        const isActive = isFlagOn(status[keys.active]);
        return {
          kind: cert.kind,
          title: isActive
            ? status[keys.title] || cert.fallbackTitle
            : status[keys.display] || cert.fallbackTitle,
          isEnabled: isFlagOn(status[keys.enabled]),
          isActive,
          isAvailable: isFlagOn(status[keys.available]),
        };
      }),
    [status],
  );
}
