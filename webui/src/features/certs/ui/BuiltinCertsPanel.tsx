import { useTranslation } from "react-i18next";
import type { useBuiltinCerts } from "@/features/certs/hooks/useBuiltinCerts";
import { BuiltinCertKind } from "@/entities/module/enums";
import { Button, Card, ListGroup, Row, Switch } from "@/shared/ui/primitives";

type BuiltinCert = ReturnType<typeof useBuiltinCerts>[number];

type BuiltinCertsPanelProps = {
  certs: BuiltinCert[];
  onToggle: (kind: BuiltinCertKind, checked: boolean) => void;
  onOpenDetail: (id: string, title: string) => void;
  title?: string;
  meta?: string;
  variant?: "list" | "table" | "tiles";
  detailLabel?: string;
};

function CertActions({
  cert,
  onToggle,
  onOpenDetail,
  detailLabel,
}: {
  cert: BuiltinCert;
  onToggle: (kind: BuiltinCertKind, checked: boolean) => void;
  onOpenDetail: (id: string, title: string) => void;
  detailLabel: string;
}) {
  const canInspect = cert.isAvailable || cert.isActive;
  return (
    <div className="bf-btn-row" style={{ gap: 8, margin: 0 }}>
      <Button
        variant="ghost"
        disabled={!canInspect}
        onClick={() => onOpenDetail(cert.kind, cert.title)}
        aria-label={detailLabel}
      >
        ℹ️
      </Button>
      <Switch
        checked={cert.isEnabled}
        onChange={(checked) => onToggle(cert.kind, checked)}
      />
    </div>
  );
}

export function BuiltinCertsPanel({
  certs,
  onToggle,
  onOpenDetail,
  title,
  meta,
  variant = "list",
  detailLabel,
}: BuiltinCertsPanelProps) {
  const { t } = useTranslation("webui");
  const resolvedTitle = title ?? t("certs.builtinTitle");
  const resolvedDetail = detailLabel ?? t("certs.detailLabel");

  const resolveCertDesc = (cert: BuiltinCert) => {
    if (cert.isActive) return t("certs.statusActive");
    if (cert.isEnabled) return t("certs.statusPendingLong");
    if (cert.isAvailable) return t("certs.statusAvailable");
    return t("certs.statusMissingApp");
  };

  if (variant === "table") {
    return (
      <Card title={resolvedTitle} meta={meta}>
        <table className="bf-table">
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
                  <Button
                    variant="ghost"
                    disabled={!(cert.isAvailable || cert.isActive)}
                    onClick={() => onOpenDetail(cert.kind, cert.title)}
                  >
                    {resolvedDetail}
                  </Button>
                </td>
                <td>
                  <Switch
                    checked={cert.isEnabled}
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
      <div className="bf-stack bf-stack--tight">
        <p className="bf-list__label" style={{ padding: 0 }}>
          {resolvedTitle}
        </p>
        {certs.map((cert) => (
          <div key={cert.kind} className="bf-cert-tile">
            <div className="bf-cert-tile__body">
              <div className="bf-row__title">{cert.title}</div>
              <div className="bf-row__desc">{resolveCertDesc(cert)}</div>
            </div>
            <CertActions
              cert={cert}
              onToggle={onToggle}
              onOpenDetail={onOpenDetail}
              detailLabel={resolvedDetail}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card title={resolvedTitle} meta={meta}>
      <ListGroup>
        {certs.map((cert) => (
          <Row
            key={cert.kind}
            title={cert.title}
            desc={resolveCertDesc(cert)}
            extra={
              <CertActions
                cert={cert}
                onToggle={onToggle}
                onOpenDetail={onOpenDetail}
                detailLabel={resolvedDetail}
              />
            }
          />
        ))}
      </ListGroup>
    </Card>
  );
}
