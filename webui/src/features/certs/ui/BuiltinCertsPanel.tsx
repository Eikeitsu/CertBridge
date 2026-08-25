import type { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
import { BuiltinCertKind } from "@/entities/module/enums";
import { Card, ListGroup, Row, Switch } from "@/shared/ui/primitives";

type BuiltinCert = ReturnType<typeof useBuiltinCerts>[number];

type BuiltinCertsPanelProps = {
  certs: BuiltinCert[];
  isPending: boolean;
  pendingKind: string | null;
  onToggle: (kind: BuiltinCertKind, checked: boolean) => void;
  title?: string;
  meta?: string;
  variant?: "list" | "table" | "tiles";
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
  title = "内置证书",
  meta,
  variant = "list",
}: BuiltinCertsPanelProps) {
  if (variant === "table") {
    return (
      <Card title={title} meta={meta}>
        <table className="cb-table">
          <thead>
            <tr>
              <th>name</th>
              <th>state</th>
              <th>sw</th>
            </tr>
          </thead>
          <tbody>
            {certs.map((cert) => (
              <tr key={cert.kind}>
                <td>{cert.title}</td>
                <td>{resolveCertDesc(cert)}</td>
                <td>
                  <Switch
                    checked={cert.isEnabled}
                    disabled={isPending && pendingKind === cert.kind}
                    onChange={(checked) => onToggle(cert.kind, checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  if (variant === "tiles") {
    return (
      <div className="cb-stack cb-stack--tight">
        <p className="cb-list__label" style={{ padding: 0 }}>
          {title}
        </p>
        {certs.map((cert) => (
          <div key={cert.kind} className="cb-cert-tile">
            <div className="cb-cert-tile__body">
              <div className="cb-row__title">{cert.title}</div>
              <div className="cb-row__desc">{resolveCertDesc(cert)}</div>
            </div>
            <Switch
              checked={cert.isEnabled}
              disabled={isPending && pendingKind === cert.kind}
              onChange={(checked) => onToggle(cert.kind, checked)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card title={title} meta={meta}>
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
