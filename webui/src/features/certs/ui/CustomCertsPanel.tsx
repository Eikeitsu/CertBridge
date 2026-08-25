import type { CustomCertificate } from "@/entities/module/types";
import { Card, ListGroup, Row, Button } from "@/shared/ui/primitives";
import { CertImportButton } from "./CertImportButton";

type CustomCertsPanelProps = {
  certificates: CustomCertificate[];
  isPending: boolean;
  onImport: (file: File) => void | Promise<unknown>;
  onRemove: (name: string) => void;
  title?: string;
  emptyLabel?: string;
  importLabel?: string;
};

export function CustomCertsPanel({
  certificates,
  isPending,
  onImport,
  onRemove,
  title,
  emptyLabel = "暂无自定义证书",
  importLabel = "导入 CA",
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
                <Button
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => onRemove(cert.name)}
                >
                  删除
                </Button>
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
