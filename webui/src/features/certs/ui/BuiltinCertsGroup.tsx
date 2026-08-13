import { Button, Switch } from "antd-mobile";
import { InformationCircleOutline } from "antd-mobile-icons";
import { ListGroup, ListRow } from "@/shared/ui";
import type { BuiltinCertKind } from "@/entities/module/types";
import { useBuiltinCerts } from "../hooks/useBuiltinCerts";
import { resolveBuiltinSubtitle } from "../lib/builtin";
import { CertBrandIcon } from "./CertBrandIcon";

type BuiltinCertsGroupProps = {
  onOpenDetail: (id: string, title: string) => void;
  onToggle: (kind: BuiltinCertKind, checked: boolean) => void;
};

export function BuiltinCertsGroup({ onOpenDetail, onToggle }: BuiltinCertsGroupProps) {
  const builtinCerts = useBuiltinCerts();

  return (
    <ListGroup title="抓包应用证书">
      {builtinCerts.map((item) => (
        <ListRow
          key={item.kind}
          leading={<CertBrandIcon kind={item.kind} />}
          title={item.title}
          subtitle={resolveBuiltinSubtitle(item)}
          actions={
            <>
              <Button
                size="mini"
                fill="none"
                disabled={!item.isAvailable}
                onClick={() => onOpenDetail(item.kind, item.title)}
              >
                <InformationCircleOutline />
              </Button>
              <Switch
                checked={item.isEnabled}
                onChange={(checked) => onToggle(item.kind, checked)}
              />
            </>
          }
        />
      ))}
    </ListGroup>
  );
}
