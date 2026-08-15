import { NxButton, NxChip, NxSwitch } from "@/shared/ui";
import type { BuiltinCertKind } from "@/entities/module/types";
import { useBuiltinCerts } from "../hooks/useBuiltinCerts";
import { resolveBuiltinFlags, resolveBuiltinSubtitle } from "../lib/builtin";
import { CertBrandIcon } from "./CertBrandIcon";

type BuiltinCertsGroupProps = {
  pendingKind?: string | null;
  onOpenDetail: (id: string, title: string) => void;
  onToggle: (kind: BuiltinCertKind, checked: boolean) => void;
};

export function BuiltinCertsGroup({
  pendingKind,
  onOpenDetail,
  onToggle,
}: BuiltinCertsGroupProps) {
  const builtinCerts = useBuiltinCerts();

  return (
    <div className="nx-cert-stack">
      {builtinCerts.map((item) => {
        const canInspect = item.isAvailable || item.isActive;
        const canToggle = item.isAvailable || item.isActive || item.isEnabled;
        const flags = resolveBuiltinFlags(item);
        return (
          <article key={item.kind} className="nx-cert-card">
            <CertBrandIcon kind={item.kind} />
            <div className="nx-cert-card__body">
              <h3 className="nx-cert-card__title">{item.title}</h3>
              <p className="nx-cert-card__sub">{resolveBuiltinSubtitle(item)}</p>
              {flags.length ? (
                <div className="nx-cert-card__flags">
                  {flags.map((flag) => (
                    <NxChip key={flag.label} tone={flag.tone}>
                      {flag.label}
                    </NxChip>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="nx-cert-card__actions">
              <NxSwitch
                checked={item.isEnabled}
                loading={pendingKind === item.kind}
                disabled={!canToggle || Boolean(pendingKind && pendingKind !== item.kind)}
                onChange={(checked) => onToggle(item.kind, checked)}
              />
              <NxButton
                variant="ghost"
                disabled={!canInspect}
                onClick={() => onOpenDetail(item.kind, item.title)}
              >
                详情
              </NxButton>
            </div>
          </article>
        );
      })}
    </div>
  );
}
