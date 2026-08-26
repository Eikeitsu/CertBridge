import type { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
import { BuiltinCertKind } from "@/entities/module/enums";
import { Card, ListGroup, Row, Switch } from "@/shared/ui/primitives";

type BuiltinCert = ReturnType<typeof useBuiltinCerts>[number];

type BuiltinCertsPanelProps = {
  certs: BuiltinCert[];
  isPending: boolean;
  pendingKind: string | null;
  onToggle: (kind: BuiltinCertKind, checked: boolean) => void;
  onOpenDetail: (id: string, title: string) => void;
  title?: string;
  meta?: string;
  variant?: "list" | "table" | "tiles";
  detailLabel?: string;
};

function resolveCertDesc(cert: BuiltinCert) {
  if (cert.isActive) return "已生效";
  if (cert.isEnabled) return "已开启，待重启";
  if (cert.isAvailable) return "可用";
  return "未检测到 App 证书";
}

function CertInfoButton({
  enabled,
  label,
  onClick,
}: {
  enabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="cb-info-btn"
      disabled={!enabled}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span aria-hidden="true">i</span>
    </button>
  );
}

function CertTitle({
  cert,
  detailLabel,
  onOpenDetail,
}: {
  cert: BuiltinCert;
  detailLabel: string;
  onOpenDetail: (id: string, title: string) => void;
}) {
  const canInspect = cert.isAvailable || cert.isActive;
  return (
    <span className="cb-cert-title">
      <span className="cb-cert-title__name">{cert.title}</span>
      <CertInfoButton
        enabled={canInspect}
        label={detailLabel}
        onClick={() => onOpenDetail(cert.kind, cert.title)}
      />
    </span>
  );
}

export function BuiltinCertsPanel({
  certs,
  isPending,
  pendingKind,
  onToggle,
  onOpenDetail,
  title = "内置证书",
  meta,
  variant = "list",
  detailLabel = "详情",
}: BuiltinCertsPanelProps) {
  if (variant === "table") {
    return (
      <Card title={title} meta={meta}>
        <table className="cb-table">
          <thead>
            <tr>
              <th>name</th>
              <th>state</th>
              <th>info</th>
              <th>sw</th>
            </tr>
          </thead>
          <tbody>
            {certs.map((cert) => (
              <tr key={cert.kind}>
                <td>{cert.title}</td>
                <td>{resolveCertDesc(cert)}</td>
                <td>
                  <CertInfoButton
                    enabled={cert.isAvailable || cert.isActive}
                    label={detailLabel}
                    onClick={() => onOpenDetail(cert.kind, cert.title)}
                  />
                </td>
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
              <div className="cb-row__title">
                <CertTitle
                  cert={cert}
                  detailLabel={detailLabel}
                  onOpenDetail={onOpenDetail}
                />
              </div>
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
            title={
              <CertTitle
                cert={cert}
                detailLabel={detailLabel}
                onOpenDetail={onOpenDetail}
              />
            }
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
