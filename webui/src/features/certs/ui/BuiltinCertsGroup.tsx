import { Button, Switch } from "antd-mobile";
import { InformationCircleOutline } from "antd-mobile-icons";
import { Flag, FlagList, ListGroup, ListRow } from "@/shared/ui";
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
    <ListGroup title="抓包应用证书">
      {builtinCerts.map((item) => {
        const canInspect = item.isAvailable || item.isActive;
        const canToggle = item.isAvailable || item.isActive || item.isEnabled;
        const flags = resolveBuiltinFlags(item);
        return (
          <ListRow
            key={item.kind}
            leading={<CertBrandIcon kind={item.kind} />}
            title={item.title}
            subtitle={resolveBuiltinSubtitle(item)}
            flags={
              flags.length ? (
                <FlagList>
                  {flags.map((flag) => (
                    <Flag key={flag.label} tone={flag.tone}>
                      {flag.label}
                    </Flag>
                  ))}
                </FlagList>
              ) : null
            }
            actions={
              <>
                <Button
                  size="mini"
                  fill="none"
                  disabled={!canInspect}
                  onClick={() => onOpenDetail(item.kind, item.title)}
                >
                  <InformationCircleOutline />
                </Button>
                <Switch
                  checked={item.isEnabled}
                  loading={pendingKind === item.kind}
                  disabled={
                    !canToggle || Boolean(pendingKind && pendingKind !== item.kind)
                  }
                  onChange={(checked) => onToggle(item.kind, checked)}
                />
              </>
            }
          />
        );
      })}
    </ListGroup>
  );
}
