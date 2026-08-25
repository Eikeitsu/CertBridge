import type { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
import { BuiltinCertKind } from "@/entities/module/enums";
import { Card, ListGroup, Row, Switch } from "@/shared/ui/primitives";

type BuiltinCert = ReturnType<typeof useBuiltinCerts>[number];

type BuiltinCertsPanelProps = {
  certs: BuiltinCert[];
  isPending: boolean;
  pendingKind: string | null;
  onToggle: (kind: BuiltinCertKind, checked: boolean) => void;
};

function resolveCertDesc(cert: BuiltinCert) {
  if (cert.isActive) return "已生效";
  if (cert.isEnabled) return "已开启，待重启";
  if (cert.isAvailable) return "可用";
  return "未检测到 App 证书";
}

export function BuiltinCertsPanel({
  certs,
  isPending,
  pendingKind,
  onToggle,
}: BuiltinCertsPanelProps) {
  return (
    <Card title="内置证书" meta="开关变更需重启后写入系统信任库">
      <ListGroup>
        {certs.map((cert) => (
          <Row
            key={cert.kind}
            title={cert.title}
            desc={resolveCertDesc(cert)}
            extra={
              <Switch
                checked={cert.isEnabled}
                disabled={isPending && pendingKind === cert.kind}
                onChange={(checked) => onToggle(cert.kind, checked)}
              />
            }
          />
        ))}
      </ListGroup>
    </Card>
  );
}
