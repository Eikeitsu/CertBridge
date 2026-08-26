import type { CustomCertificate } from "@/entities/module/types";
import { Card, ListGroup, Row, Button } from "@/shared/ui/primitives";
import { CertImportButton } from "./CertImportButton";

type CustomCertsPanelProps = {
  certificates: CustomCertificate[];
  isPending: boolean;
  onImport: (file: File) => void | Promise<unknown>;
  onRemove: (name: string) => void;
  onOpenDetail: (id: string, title: string) => void;
  title?: string;
  emptyLabel?: string;
  importLabel?: string;
  detailLabel?: string;
};

export function CustomCertsPanel({
  certificates,
  isPending,
  onImport,
  onRemove,
  onOpenDetail,
  title,
  emptyLabel = "暂无自定义证书",
  importLabel = "导入 CA",
  detailLabel = "详情",
}: CustomCertsPanelProps) {
  return (
    <Card title={title ?? `自定义证书 (${certificates.length})`}>
      <ListGroup>
        {certificates.length ? (
          certificates.map((cert) => (
            <Row
              key={cert.name}
              title={cert.display || cert.name}
              desc={cert.name}
              extra={
                <div className="cb-btn-row" style={{ gap: 8, margin: 0 }}>
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      onOpenDetail(`custom:${cert.name}`, cert.display || cert.name)
                    }
                  >
                    {detailLabel}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => onRemove(cert.name)}
                  >
                    删除
                  </Button>
                </div>
              }
            />
          ))
        ) : (
          <div className="cb-empty">{emptyLabel}</div>
        )}
      </ListGroup>
      <div style={{ marginTop: 12 }}>
        <CertImportButton disabled={isPending} onImport={onImport} label={importLabel} />
      </div>
    </Card>
  );
}
